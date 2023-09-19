import type { PayloadAction } from '@reduxjs/toolkit'
import { createAsyncThunk, createSlice, prepareAutoBatched } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { deserializeNftAssetReference, fromAssetId } from '@shapeshiftoss/caip'
import cloneDeep from 'lodash/cloneDeep'
import { PURGE } from 'redux-persist'
import type { PartialRecord } from 'lib/utils'
import { isRejected } from 'lib/utils'
import type { ReduxState } from 'state/reducer'
import type { AssetsState } from 'state/slices/assetsSlice/assetsSlice'
import { assets as assetsSlice, makeAsset } from 'state/slices/assetsSlice/assetsSlice'
import { portfolio as portfolioSlice } from 'state/slices/portfolioSlice/portfolioSlice'
import type { Portfolio, WalletId } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import { initialState as initialPortfolioState } from 'state/slices/portfolioSlice/portfolioSliceCommon'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'
import { covalentApi } from '../covalent/covalentApi'
import { zapperApi } from '../zapper/zapperApi'
import { selectNftCollectionById } from './selectors'
import type { NftCollectionType, NftItem, NftItemWithCollection } from './types'
import {
  getAlchemyCollectionData,
  getAlchemyNftData,
  getAlchemyNftsUserData,
  updateNftCollection,
  updateNftItem,
} from './utils'

type GetNftUserTokensInput = {
  accountIds: AccountId[]
}

type GetNftInput = {
  assetId: AssetId
}

type GetNftCollectionInput = {
  collectionId: AssetId
  // This looks weird but is correct. We abuse the Zapper balances endpoint to get collection meta
  accountIds: AccountId[]
}

type NftState = {
  selectedNftAvatarByWalletId: Record<WalletId, AssetId>
  nfts: {
    byId: PartialRecord<AssetId, NftItem>
    ids: AssetId[]
  }
  collections: {
    byId: PartialRecord<AssetId, NftCollectionType>
    ids: AssetId[]
  }
}

const NFT_NAME_BLACKLIST = [
  'voucher',
  'airdrop',
  'giveaway',
  'promo',
  'airdrop',
  'rewards',
  'ticket',
  'winner',
  '$',
  'pirategirls',
  ' USDC',
  'calim cryptopunk',
  'coupon',
]
// This escapes special characters we may encounter in NFTS, so we can add them to the blacklist
// e.g "$9999+ free giveaway *limited time only*" would not work without it
const nftNameBlacklistRegex = new RegExp(
  NFT_NAME_BLACKLIST.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'i',
)
const isSpammyNftText = (nftText: string) => nftNameBlacklistRegex.test(nftText)

const BLACKLISTED_COLLECTION_IDS = [
  'eip155:137/erc1155:0x30825b65e775678997c7fbc5831ab492c697448e',
  'eip155:137/erc1155:0x4217495f2a128da8d6122d120a1657753823721a',
  'eip155:137/erc1155:0x54e75b47353a5ded078d8eb6ba67ff01a2a18ef7',
  'eip155:137/erc1155:0x7d33048b74c24d695d349e73a59b7de3ed50c4c0',
  'eip155:137/erc1155:0xb1cfea0eb0f67a50b896985bda6368fc1c21907b',
  'eip155:137/erc1155:0xc165d899628c5fd74e19c91de596a9ea2f3599ec',
  'eip155:137/erc1155:0xcf2576238640a3a232fa6046d549dfb753a805f4',
  'eip155:137/erc1155:0xcf63b89da7c6ada007fbef13fa1e8453756ba7a6',
  'eip155:137/erc1155:0xda8091a96aefcc2bec5ed64eb2e18008ebf7806c',
  'eip155:137/erc1155:0xe0b7dafe2eb86ad56386676a61781d863144db1e',
  'eip155:137/erc1155:0xed13387ea51efb26b1281bd6decc352141fd312a',
  'eip155:137/erc1155:0xf02521228c6250b255abbc4ea66fd5aa86aa2ce0',
  'eip155:137/erc1155:0xf30437ad7d081046b4931e29460fcb0d7bbaca46',
  'eip155:137/erc1155:0xfd920bd499511d0f5e37b4405a7986a4d6f1abe3',
  'eip155:137/erc1155:0x55d50a035bc5830dac9f1a42b71c48cbad568d60',
  'eip155:137/erc1155:0x5620a667cbe1eb7e1e27087d135881a546456ebb',
]
export const initialState: NftState = {
  selectedNftAvatarByWalletId: {},
  nfts: {
    byId: {},
    ids: [],
  },
  collections: {
    byId: {
      ...BLACKLISTED_COLLECTION_IDS.reduce<Partial<Record<AssetId, NftCollectionType>>>(
        (acc, assetId) => ({ ...acc, [assetId]: { assetId, isSpam: true } }),
        {},
      ),
    },
    ids: BLACKLISTED_COLLECTION_IDS,
  },
}

type PortfolioAndAssetsUpsertPayload = {
  nftsById: Record<AssetId, NftItem>
}

const upsertPortfolioAndAssets = createAsyncThunk<void, PortfolioAndAssetsUpsertPayload>(
  'nft/upsertPortfolioAndAssets',
  ({ nftsById }, { dispatch }) => {
    const assetsToUpsert = Object.values(nftsById).reduce<AssetsState>(
      (acc, nft) => {
        acc.byId[nft.assetId] = makeAsset({
          assetId: nft.assetId,
          id: nft.id,
          symbol: nft.symbol ?? 'N/A',
          name: nft.name,
          precision: 0,
          icon: nft.medias[0]?.originalUrl,
        })
        acc.ids.push(nft.assetId)
        return acc
      },
      { byId: {}, ids: [] },
    )

    const portfolio = cloneDeep<Portfolio>(initialPortfolioState)

    Object.values(nftsById).forEach(nft => {
      const accountId = nft.ownerAccountId

      if (!portfolio.accounts.byId[accountId]) {
        portfolio.accounts.byId[accountId] = { assetIds: [nft.assetId] }
        portfolio.accounts.ids.push(accountId)
      } else {
        portfolio.accounts.byId[accountId].assetIds.push(nft.assetId)
      }

      const balanceData = {
        // i.e 1 for ERC-721s / 0, 1, or more for ERC-1155s
        [nft.assetId]: nft.balance === undefined ? '1' : nft.balance,
      }
      if (!portfolio.accountBalances.byId[accountId]) {
        portfolio.accountBalances.byId[accountId] = balanceData
        portfolio.accountBalances.ids.push(accountId)
      } else {
        portfolio.accountBalances.byId[accountId] = Object.assign(
          portfolio.accountBalances.byId[accountId],
          balanceData,
        )
      }
    })

    dispatch(assetsSlice.actions.upsertAssets(assetsToUpsert))
    dispatch(portfolioSlice.actions.upsertPortfolio(portfolio))
  },
)

export const nft = createSlice({
  name: 'nftData',
  initialState,
  reducers: {
    clear: () => initialState,
    upsertCollection: (state, action: PayloadAction<NftCollectionType>) => {
      const maybeCurrentCollectionItem = state.collections.byId[action.payload.assetId]
      const collectionItemToUpsert = maybeCurrentCollectionItem
        ? updateNftCollection(maybeCurrentCollectionItem, action.payload)
        : action.payload
      state.collections.byId = Object.assign({}, state.collections.byId, {
        [action.payload.assetId]: collectionItemToUpsert,
      })
      state.collections.ids = Array.from(
        new Set(state.collections.ids.concat([action.payload.assetId])),
      )
    },
    upsertCollections: (state, action: PayloadAction<NftState['collections']>) => {
      state.collections.byId = Object.assign({}, state.collections.byId, action.payload.byId)
      state.collections.ids = Array.from(new Set(state.collections.ids.concat(action.payload.ids)))
    },
    upsertNft: (state, action: PayloadAction<NftItem>) => {
      state.nfts.byId = Object.assign({}, state.nfts.byId, {
        [action.payload.assetId]: action.payload,
      })
      state.nfts.ids = Array.from(new Set(state.nfts.ids.concat(action.payload.assetId)))
    },
    upsertNfts: (state, action: PayloadAction<NftState['nfts']>) => {
      state.nfts.byId = Object.assign({}, state.nfts.byId, action.payload.byId)
      state.nfts.ids = Array.from(new Set(state.nfts.ids.concat(action.payload.ids)))
    },
    setWalletSelectedNftAvatar: {
      reducer: (
        draftState,
        { payload }: { payload: { nftAssetId: AssetId; walletId: WalletId } },
      ) => {
        draftState.selectedNftAvatarByWalletId[payload.walletId] = payload.nftAssetId
      },
      // Use the `prepareAutoBatched` utility to automatically
      // add the `action.meta[SHOULD_AUTOBATCH]` field the enhancer needs
      prepare: prepareAutoBatched<{ nftAssetId: AssetId; walletId: WalletId }>(),
    },
  },
  extraReducers: builder => builder.addCase(PURGE, () => initialState),
})

export const nftApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'nftApi',
  endpoints: build => ({
    getNftUserTokens: build.query<NftItem[], GetNftUserTokensInput>({
      queryFn: async ({ accountIds }, { dispatch, getState }) => {
        const state = getState() as ReduxState

        const services = [
          getAlchemyNftsUserData,
          (accountIds: AccountId[]) =>
            dispatch(
              zapperApi.endpoints.getZapperNftUserTokens.initiate(
                { accountIds },
                { forceRefetch: true },
              ),
            ),
          (accountIds: AccountId[]) =>
            dispatch(
              covalentApi.endpoints.getCovalentNftUserTokens.initiate(
                { accountIds },
                { forceRefetch: true },
              ),
            ),
        ]

        const results = await Promise.allSettled(services.map(service => service(accountIds)))

        const nftsWithCollectionById = results.reduce<Record<AssetId, NftItemWithCollection>>(
          (acc, result) => {
            if (isRejected(result)) return acc

            if (result.value.data) {
              const { data } = result.value

              data.forEach(item => {
                const { assetId } = item
                const { assetReference, chainId } = fromAssetId(assetId)

                const [contractAddress, id] = deserializeNftAssetReference(assetReference)

                const foundNftAssetId = Object.keys(acc).find(accAssetId => {
                  const { assetReference: accAssetReference, chainId: accChainId } =
                    fromAssetId(accAssetId)
                  const [accContractAddress, accId] =
                    deserializeNftAssetReference(accAssetReference)
                  return (
                    accContractAddress === contractAddress && accId === id && accChainId === chainId
                  )
                })

                if (!foundNftAssetId) {
                  acc[assetId] = item
                } else {
                  acc[assetId] = updateNftItem(acc[foundNftAssetId], item)
                }
              })
              // An actual RTK error, different from a rejected promise i.e getAlchemyNftData rejecting
            } else if (result.value.isError) {
              console.error(result.value.error)
            }

            return acc
          },
          {},
        )

        const nftsWithCollection = Object.values(nftsWithCollectionById)

        const nftsById = nftsWithCollection.reduce<Record<AssetId, NftItem>>((acc, item) => {
          const { collection, ...nftItemWithoutCollection } = item
          const nftItem: NftItem = {
            ...nftItemWithoutCollection,
            collectionId: item.collection.assetId,
          }
          acc[item.assetId] = nftItem
          return acc
        }, {})

        dispatch(nft.actions.upsertNfts({ byId: nftsById, ids: Object.keys(nftsById) }))

        const collectionsById = nftsWithCollection.reduce<NftState['collections']['byId']>(
          (acc, _item) => {
            const item = cloneDeep(_item)
            if (!item.collection.assetId) return acc
            const cachedCollection = selectNftCollectionById(state, item.collection.assetId)
            if (cachedCollection?.isSpam) item.collection.isSpam = true
            if ([item.description, item.name, item.symbol].some(isSpammyNftText))
              item.collection.isSpam = true
            acc[item.collection.assetId] = item.collection
            return acc
          },
          {},
        )

        dispatch(
          nft.actions.upsertCollections({
            byId: collectionsById,
            ids: Object.keys(collectionsById),
          }),
        )

        dispatch(upsertPortfolioAndAssets({ nftsById }))

        const data = Object.values(nftsById)

        return { data }
      },
    }),
    getNft: build.query<NftItemWithCollection, GetNftInput>({
      queryFn: async ({ assetId }, { dispatch }) => {
        try {
          const { data: nftDataWithCollection } = await getAlchemyNftData(assetId)

          const { collection, ...nftItemWithoutId } = nftDataWithCollection
          const nftItem: NftItem = {
            ...nftItemWithoutId,
            collectionId: nftDataWithCollection.collection.assetId,
          }

          dispatch(nft.actions.upsertNft(nftItem))

          return { data: nftDataWithCollection }
        } catch (error) {
          return {
            error: {
              status: 500,
              data: {
                message: 'Failed to fetch nft data',
              },
            },
          }
        }
      },
    }),

    getNftCollection: build.query<NftCollectionType, GetNftCollectionInput>({
      queryFn: async ({ collectionId, accountIds }, { dispatch }) => {
        try {
          const services = [
            getAlchemyCollectionData,
            (collectionId: AssetId, accountIds: AccountId[]) =>
              dispatch(
                zapperApi.endpoints.getZapperCollectionBalance.initiate({
                  accountIds,
                  collectionId,
                }),
              ),
          ]

          const results = await Promise.allSettled(
            services.map(service => service(collectionId, accountIds)),
          )

          const collectionData = results.reduce<NftCollectionType | null>((acc, result) => {
            if (isRejected(result)) return acc

            const { data } = result.value

            if (!data) return acc
            if (!acc) return data

            return updateNftCollection(acc, data)
          }, null)

          if (!collectionData) {
            throw new Error('Failed to fetch nft collection data')
          }

          dispatch(nft.actions.upsertCollection(collectionData))
          return { data: collectionData }
        } catch (error) {
          console.error(error)
          return {
            error: {
              status: 500,
              data: {
                message: 'Failed to fetch nft collection data',
              },
            },
          }
        }
      },
    }),
  }),
})

export const { useGetNftCollectionQuery } = nftApi
