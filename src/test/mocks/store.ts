import { DEFAULT_HISTORY_TIMEFRAME } from 'constants/Config'
import type { ReduxState } from 'state/reducer'
import { defaultAsset } from 'state/slices/assetsSlice/assetsSlice'
import { CurrencyFormats, HomeMarketView } from 'state/slices/preferencesSlice/preferencesSlice'

const mockApiFactory = <T extends unknown>(reducerPath: T) => ({
  queries: {},
  mutations: {},
  provided: {},
  subscriptions: {},
  config: {
    reducerPath,
    keepUnusedDataFor: 0,
    online: false,
    focused: false,
    middlewareRegistered: false,
    refetchOnFocus: false,
    refetchOnMountOrArgChange: false,
    refetchOnReconnect: false,
  },
})

const mockSwapperApi = Object.assign(mockApiFactory('swapperApi' as const), {
  provided: {
    TradeQuote: {},
  },
})

const mockLimitOrderApi = Object.assign(mockApiFactory('limitOrderApi' as const), {
  provided: {
    LimitOrder: {},
  },
})

export const mockStore: ReduxState = {
  assetApi: mockApiFactory('assetApi' as const),
  portfolioApi: mockApiFactory('portfolioApi' as const),
  marketApi: mockApiFactory('marketApi' as const),
  txHistoryApi: mockApiFactory('txHistoryApi' as const),
  zapperApi: mockApiFactory('zapperApi' as const),
  nftApi: mockApiFactory('nftApi' as const),
  covalentApi: mockApiFactory('covalentApi' as const),
  zapper: mockApiFactory('zapper' as const),
  swapperApi: mockSwapperApi,
  foxyApi: mockApiFactory('foxyApi' as const),
  fiatRampApi: mockApiFactory('fiatRampApi' as const),
  snapshotApi: mockApiFactory('snapshotApi' as const),
  opportunitiesApi: mockApiFactory('opportunitiesApi' as const),
  abiApi: mockApiFactory('abiApi' as const),
  limitOrderApi: mockLimitOrderApi,
  portfolio: {
    _persist: {
      version: 0,
      rehydrated: false,
    },
    isAccountMetadataLoadingByAccountId: {},
    accounts: {
      byId: {},
      ids: [],
    },
    accountBalances: {
      byId: {},
      ids: [],
    },
    accountMetadata: {
      byId: {},
      ids: [],
    },
    enabledAccountIds: {},
    wallet: {
      byId: {},
      ids: [],
    },
  },
  preferences: {
    featureFlags: {
      Jaypegz: false,
      Optimism: false,
      Polygon: false,
      Gnosis: false,
      Arbitrum: false,
      ArbitrumNova: false,
      Solana: false,
      ArbitrumBridge: false,
      Base: false,
      BnbSmartChain: false,
      ZrxSwap: false,
      ThorSwap: false,
      ThorSwapStreamingSwaps: false,
      Cowswap: false,
      Yat: false,
      WalletConnectToDapps: false,
      WalletConnectToDappsV2: false,
      SaversVaults: false,
      SaversVaultsDeposit: false,
      SaversVaultsWithdraw: false,
      Mixpanel: false,
      LifiSwap: false,
      DynamicLpAssets: false,
      ReadOnlyAssets: false,
      CovalentJaypegs: false,
      Chatwoot: false,
      AdvancedSlippage: false,
      WalletConnectV2: false,
      CustomSendNonce: false,
      ThorchainLending: false,
      ThorchainLendingBorrow: false,
      ThorchainLendingRepay: false,
      ThorchainLP: false,
      ThorchainLpDeposit: false,
      ThorchainLpWithdraw: false,
      LedgerWallet: false,
      ThorchainSwapLongtail: false,
      ThorchainSwapL1ToLongtail: false,
      ShapeShiftMobileWallet: false,
      AccountManagement: false,
      AccountManagementLedger: false,
      RFOX: false,
      CustomTokenImport: false,
      ArbitrumBridgeClaims: false,
      UsdtApprovalReset: false,
      RunePool: false,
      Portals: false,
      Markets: false,
      PhantomWallet: false,
      FoxPage: false,
      FoxPageRFOX: false,
      FoxPageFoxSection: false,
      FoxPageFoxFarmingSection: false,
      FoxPageGovernance: false,
      LimitOrders: false,
      Chainflip: false,
      ChainflipDca: false,
      PublicTradeRoute: false,
      ThorFreeFees: false,
    },
    selectedLocale: 'en',
    balanceThreshold: '0',
    selectedCurrency: 'USD',
    currencyFormat: CurrencyFormats.DotDecimalCommaThousands,
    chartTimeframe: DEFAULT_HISTORY_TIMEFRAME,
    showWelcomeModal: false,
    showConsentBanner: true,
    showSnapsModal: true,
    snapInstalled: false,
    watchedAssets: [],
    selectedHomeView: HomeMarketView.TopAssets,
    // the following object is required by redux-persist
    _persist: {
      version: 0,
      rehydrated: false,
    },
  },
  assets: {
    _persist: {
      version: 0,
      rehydrated: false,
    },
    byId: {},
    ids: [],
    relatedAssetIndex: {},
  },
  marketData: {
    _persist: {
      version: 0,
      rehydrated: false,
    },
    crypto: {
      byId: {},
      ids: [],
      priceHistory: {},
    },
    fiat: {
      byId: {},
      ids: [],
      priceHistory: {},
    },
    isMarketDataLoaded: false,
  },
  txHistory: {
    _persist: {
      version: 0,
      rehydrated: false,
    },
    txs: {
      byId: {},
      byAccountIdAssetId: {},
      ids: [],
    },
    hydrationMeta: {},
  },
  opportunities: {
    _persist: {
      version: 0,
      rehydrated: false,
    },
    lp: {
      byAccountId: {},
      byId: {},
      ids: [],
    },
    staking: {
      byAccountId: {},
      byId: {},
      ids: [],
    },
    userStaking: {
      byId: {},
      ids: [],
    },
  },
  nft: {
    _persist: {
      version: 0,
      rehydrated: false,
    },
    selectedNftAvatarByWalletId: {},
    nfts: {
      byId: {},
      ids: [],
    },
    collections: {
      byId: {},
      ids: [],
    },
  },
  tradeInput: {
    buyAsset: defaultAsset,
    sellAsset: defaultAsset,
    sellAccountId: undefined,
    buyAccountId: undefined,
    sellAmountCryptoPrecision: '0',
    isInputtingFiatSellAmount: false,
    manualReceiveAddress: undefined,
    isManualReceiveAddressValidating: false,
    isManualReceiveAddressEditing: false,
    isManualReceiveAddressValid: undefined,
    slippagePreferencePercentage: undefined,
  },
  limitOrderInput: {
    buyAsset: defaultAsset,
    sellAsset: defaultAsset,
    sellAccountId: undefined,
    buyAccountId: undefined,
    sellAmountCryptoPrecision: '0',
    isInputtingFiatSellAmount: false,
    manualReceiveAddress: undefined,
    isManualReceiveAddressValidating: false,
    isManualReceiveAddressEditing: false,
    isManualReceiveAddressValid: undefined,
    slippagePreferencePercentage: undefined,
    limitPriceBuyAsset: '0',
  },
  tradeQuoteSlice: {
    activeQuoteMeta: undefined,
    confirmedQuote: undefined,
    activeStep: undefined,
    tradeExecution: {},
    tradeQuotes: {},
    tradeQuoteDisplayCache: [],
    isTradeQuoteRequestAborted: false,
  },
  snapshot: {
    _persist: {
      version: 0,
      rehydrated: false,
    },
    votingPowerByModel: {
      SWAPPER: undefined,
      THORCHAIN_LP: undefined,
      THORSWAP: undefined,
    },
    strategies: undefined,
    thorStrategies: undefined,
    proposals: undefined,
  },
  localWalletSlice: {
    _persist: {
      version: 0,
      rehydrated: false,
    },
    walletType: null,
    walletDeviceId: null,
    nativeWalletName: null,
    rdns: null,
  },
}
