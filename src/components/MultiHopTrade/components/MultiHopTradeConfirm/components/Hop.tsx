import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import {
  Button,
  Card,
  CardFooter,
  Circle,
  Collapse,
  Divider,
  Flex,
  HStack,
  Stepper,
  Tooltip,
} from '@chakra-ui/react'
import type {
  SupportedTradeQuoteStepIndex,
  SwapperName,
  TradeQuote,
  TradeQuoteStep,
} from '@shapeshiftoss/swapper'
import { isArbitrumBridgeTradeQuoteOrRate } from '@shapeshiftoss/swapper/dist/swappers/ArbitrumBridgeSwapper/getTradeQuote/getTradeQuote'
import prettyMilliseconds from 'pretty-ms'
import { useCallback, useMemo } from 'react'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { ProtocolIcon } from 'components/Icons/Protocol'
import { SlippageIcon } from 'components/Icons/Slippage'
import { RawText, Text } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { fromBaseUnit } from 'lib/math'
import { assertUnreachable } from 'lib/utils'
import {
  selectActiveQuote,
  selectHopExecutionMetadata,
  selectHopNetworkFeeUserCurrency,
  selectHopTotalProtocolFeesFiatPrecision,
  selectIsActiveQuoteMultiHop,
} from 'state/slices/tradeQuoteSlice/selectors'
import { HopExecutionState, TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector } from 'state/store'

import { TwirlyToggle } from '../../TwirlyToggle'
import { ApprovalStep } from './ApprovalStep/ApprovalStep'
import { AssetSummaryStep } from './AssetSummaryStep'
import { FeeStep } from './FeeStep'
import { HopTransactionStep } from './HopTransactionStep'
import { TimeRemaining } from './TimeRemaining'

const collapseWidth = {
  width: '100%',
  // fixes pulse animation getting cut off
  overflow: undefined,
}

export const Hop = ({
  swapperName,
  tradeQuoteStep,
  hopIndex,
  isOpen,
  slippageTolerancePercentageDecimal,
  onToggleIsOpen,
  activeTradeId,
  initialActiveTradeId,
}: {
  swapperName: SwapperName
  tradeQuoteStep: TradeQuoteStep
  hopIndex: SupportedTradeQuoteStepIndex
  isOpen: boolean
  slippageTolerancePercentageDecimal: string | undefined
  onToggleIsOpen?: () => void
  activeTradeId: TradeQuote['id']
  initialActiveTradeId: TradeQuote['id']
}) => {
  const {
    number: { toCrypto },
  } = useLocaleFormatter()
  const translate = useTranslate()
  const hopTotalProtocolFeesFiatUserCurrencyFilter = useMemo(() => {
    return {
      hopIndex,
    }
  }, [hopIndex])
  const networkFeeFiatUserCurrency = useAppSelector(state =>
    selectHopNetworkFeeUserCurrency(state, hopTotalProtocolFeesFiatUserCurrencyFilter),
  )
  const protocolFeeFiatPrecision = useAppSelector(state =>
    selectHopTotalProtocolFeesFiatPrecision(state, hopIndex),
  )
  const history = useHistory()
  const isMultiHopTrade = useAppSelector(selectIsActiveQuoteMultiHop)

  const activeQuote = useAppSelector(selectActiveQuote)

  const isArbitrumBridgeWithdraw = useMemo(() => {
    return isArbitrumBridgeTradeQuoteOrRate(activeQuote) && activeQuote.direction === 'withdrawal'
  }, [activeQuote])

  const hopExecutionMetadataFilter = useMemo(() => {
    return {
      tradeId: activeTradeId,
      hopIndex,
    }
  }, [activeTradeId, hopIndex])
  const rateHopExecutionMetadataFilter = useMemo(
    () => ({
      tradeId: initialActiveTradeId,
      hopIndex,
    }),
    [hopIndex, initialActiveTradeId],
  )

  const {
    state: hopExecutionState,
    permit2,
    swap,
  } = useAppSelector(state => selectHopExecutionMetadata(state, hopExecutionMetadataFilter))

  // Get allowance approval data from initial (rate) tradeId
  // We need to keep track of initialActiveTradeId and use it as a filter as we lose the original tradeId when we go from rate to final quote,
  // since the two are entirely different IDs
  // As a result, we would lose all allowance approval data, meaning the allowance step row would disappear right after completing it,
  // as well as from the "Trade Confirmed" summary
  const { allowanceApproval } = useAppSelector(state =>
    selectHopExecutionMetadata(state, rateHopExecutionMetadataFilter),
  )

  const isError = useMemo(
    () => [allowanceApproval.state, swap.state].includes(TransactionExecutionState.Failed),
    [allowanceApproval.state, swap.state],
  )
  const buyAmountCryptoPrecision = useMemo(
    () =>
      fromBaseUnit(
        tradeQuoteStep.buyAmountAfterFeesCryptoBaseUnit,
        tradeQuoteStep.buyAsset.precision,
      ),
    [tradeQuoteStep.buyAmountAfterFeesCryptoBaseUnit, tradeQuoteStep.buyAsset.precision],
  )

  const buyAmountCryptoFormatted = useMemo(
    () => toCrypto(buyAmountCryptoPrecision, tradeQuoteStep.buyAsset.symbol),
    [toCrypto, buyAmountCryptoPrecision, tradeQuoteStep.buyAsset.symbol],
  )

  const rightComponent = useMemo(() => {
    switch (swap.state) {
      case TransactionExecutionState.AwaitingConfirmation:
        return (
          tradeQuoteStep.estimatedExecutionTimeMs !== undefined && (
            <RawText fontWeight='bold'>
              {prettyMilliseconds(tradeQuoteStep.estimatedExecutionTimeMs)}
            </RawText>
          )
        )
      case TransactionExecutionState.Pending:
        // The hop may be pending, but it doesn't mean that it has been signed and broadcasted
        if (!swap.sellTxHash) {
          return (
            tradeQuoteStep.estimatedExecutionTimeMs !== undefined && (
              <RawText fontWeight='bold'>
                {prettyMilliseconds(tradeQuoteStep.estimatedExecutionTimeMs)}
              </RawText>
            )
          )
        }
        return (
          tradeQuoteStep.estimatedExecutionTimeMs !== undefined && (
            <TimeRemaining initialTimeMs={tradeQuoteStep.estimatedExecutionTimeMs} />
          )
        )
      case TransactionExecutionState.Complete:
        return onToggleIsOpen ? (
          <TwirlyToggle isOpen={isOpen} onToggle={onToggleIsOpen} p={4} />
        ) : null
      default:
        return null
    }
  }, [swap.state, swap.sellTxHash, tradeQuoteStep.estimatedExecutionTimeMs, onToggleIsOpen, isOpen])

  const activeStep = useMemo(() => {
    switch (hopExecutionState) {
      case HopExecutionState.Pending:
        return -Infinity
      case HopExecutionState.AwaitingAllowanceReset:
      // fallthrough
      case HopExecutionState.AwaitingAllowanceApproval:
      // fallthrough
      case HopExecutionState.AwaitingPermit2Eip712Sign:
        return hopIndex === 0 ? 1 : 0
      case HopExecutionState.AwaitingSwap:
        return hopIndex === 0 ? 2 : 1
      case HopExecutionState.Complete:
        return Infinity
      default:
        assertUnreachable(hopExecutionState)
    }
  }, [hopExecutionState, hopIndex])

  const title = useMemo(() => {
    const isBridge = tradeQuoteStep.buyAsset.chainId !== tradeQuoteStep.sellAsset.chainId

    return isBridge
      ? translate('trade.hopTitle.bridge', { swapperName })
      : translate('trade.hopTitle.swap', { swapperName })
  }, [swapperName, tradeQuoteStep.buyAsset.chainId, tradeQuoteStep.sellAsset.chainId, translate])

  const shouldRenderFinalSteps = !isMultiHopTrade || hopIndex === 1

  const stepIcon = useMemo(() => {
    if (isError) {
      return (
        <Circle size={8} bg='background.error'>
          <WarningIcon color='text.error' />
        </Circle>
      )
    }

    switch (hopExecutionState) {
      case HopExecutionState.Complete:
        return (
          <Circle size={8} bg='background.success'>
            <CheckCircleIcon color='text.success' />
          </Circle>
        )
      case HopExecutionState.AwaitingAllowanceReset:
      case HopExecutionState.AwaitingAllowanceApproval:
      case HopExecutionState.AwaitingPermit2Eip712Sign:
      case HopExecutionState.AwaitingSwap:
        return (
          <Circle size={8} bg='background.surface.raised.base'>
            <CircularProgress size={4} />
          </Circle>
        )
      default:
        return (
          <Circle size={8} borderColor='border.base' borderWidth={2}>
            <RawText as='b'>{hopIndex + 1}</RawText>
          </Circle>
        )
    }
  }, [hopExecutionState, hopIndex, isError])

  const LastStepArbitrumBridgeButton = useCallback(() => {
    if (hopExecutionState !== HopExecutionState.Complete) return null

    const handleClick = () => {
      history.push('/trade/claim')
    }

    return (
      // eslint-disable-next-line react-memo/require-usememo
      <Button size='sm' onClick={handleClick}>
        {translate('bridge.viewClaimStatus')}
      </Button>
    )
  }, [translate, history, hopExecutionState])

  return (
    <Card flex={1} bg='transparent' borderWidth={0} borderRadius={0} width='full' boxShadow='none'>
      <HStack width='full' justifyContent='space-between' px={6} marginTop={4}>
        <HStack>
          {stepIcon}
          <RawText as='b'>{title}</RawText>
        </HStack>
        {rightComponent}
      </HStack>
      <Collapse in={isOpen}>
        <Stepper index={activeStep} orientation='vertical' gap='0' margin={6}>
          {hopIndex === 0 && (
            <AssetSummaryStep
              asset={tradeQuoteStep.sellAsset}
              amountCryptoBaseUnit={tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit}
            />
          )}

          <Collapse
            in={allowanceApproval.isInitiallyRequired === true || permit2.isRequired === true}
            style={collapseWidth}
          >
            {(allowanceApproval.isInitiallyRequired === true || permit2.isRequired === true) && (
              <ApprovalStep
                tradeQuoteStep={tradeQuoteStep}
                hopIndex={hopIndex}
                activeTradeId={activeTradeId}
              />
            )}
          </Collapse>
          <HopTransactionStep
            swapperName={swapperName}
            tradeQuoteStep={tradeQuoteStep}
            isActive={hopExecutionState === HopExecutionState.AwaitingSwap}
            hopIndex={hopIndex}
            isLastStep={!shouldRenderFinalSteps}
            activeTradeId={activeTradeId}
          />
          {shouldRenderFinalSteps ? <FeeStep /> : null}
          {shouldRenderFinalSteps && (
            <AssetSummaryStep
              asset={tradeQuoteStep.buyAsset}
              amountCryptoBaseUnit={tradeQuoteStep.buyAmountAfterFeesCryptoBaseUnit}
              isLastStep={shouldRenderFinalSteps}
              button={isArbitrumBridgeWithdraw ? <LastStepArbitrumBridgeButton /> : undefined}
            />
          )}
        </Stepper>
      </Collapse>
      <Divider width='auto' ml={6} borderColor='border.base' opacity={1} />
      <CardFooter fontSize='sm' pl={8}>
        <HStack width='full' justifyContent='space-between'>
          <Tooltip
            label={translate(
              networkFeeFiatUserCurrency
                ? 'trade.tooltip.gasFee'
                : 'trade.tooltip.continueSwapping',
            )}
          >
            <Flex alignItems='center' gap={2}>
              <Flex color='text.subtle'>
                <FaGasPump />
              </Flex>
              {!networkFeeFiatUserCurrency ? (
                <Text translation={'trade.unknownGas'} fontSize='sm' />
              ) : (
                <Amount.Fiat value={networkFeeFiatUserCurrency} display='inline' />
              )}
            </Flex>
          </Tooltip>

          <Tooltip
            label={translate(
              protocolFeeFiatPrecision
                ? 'trade.tooltip.protocolFee'
                : 'trade.tooltip.continueSwapping',
            )}
          >
            <Flex alignItems='center' gap={2}>
              <Flex color='text.subtle'>
                <ProtocolIcon />
              </Flex>
              {protocolFeeFiatPrecision ? (
                <Amount.Fiat value={protocolFeeFiatPrecision} display='inline' />
              ) : (
                <Text translation={'trade.unknownProtocolFee'} fontSize='sm' />
              )}
            </Flex>
          </Tooltip>

          {slippageTolerancePercentageDecimal !== undefined && (
            <Tooltip
              label={translate('trade.tooltip.slippage', {
                amount: buyAmountCryptoFormatted,
              })}
            >
              <Flex alignItems='center' gap={2}>
                <Flex color='text.subtle'>
                  <SlippageIcon />
                </Flex>
                <Amount.Percent value={slippageTolerancePercentageDecimal} display='inline' />
              </Flex>
            </Tooltip>
          )}
        </HStack>
      </CardFooter>
    </Card>
  )
}
