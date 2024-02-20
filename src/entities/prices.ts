import { BigInt, Address } from "@graphprotocol/graph-ts";
import { EventData1 } from "../utils/eventData1";
import { OraclePriceUpdateEventData } from "../utils/eventData/OraclePriceUpdateEventData";
import { TokenPrice, Candle } from "../../generated/schema";
import { ZERO } from "../utils/number";

export function handleOraclePriceUpdate(eventData: EventData1): void {
  handlePriceUpdate(eventData);
  let event = new OraclePriceUpdateEventData(eventData);
  let tokenPrice = getOrCreateTokenPrice(event.token);

  tokenPrice.minPrice = event.minPrice;
  tokenPrice.maxPrice = event.maxPrice;
  tokenPrice.updateAt = event.timestamp;

  tokenPrice.save();
}

function getOrCreateTokenPrice(tokenAddress: string): TokenPrice {
  let tokenPrice = TokenPrice.load(tokenAddress);
  return tokenPrice ? tokenPrice! : new TokenPrice(tokenAddress);
}

export function getTokenPrice(
  tokenAddress: string,
  useMax: boolean = false
): BigInt {
  let priceRef = TokenPrice.load(tokenAddress);
  if (!priceRef) {
    return BigInt.fromI32(0);
  }
  return useMax ? priceRef.maxPrice : priceRef.minPrice;
}

export function convertUsdToAmount(
  tokenAddress: string,
  usd: BigInt,
  useMax: boolean = true
): BigInt {
  let price = getTokenPrice(tokenAddress, useMax);
  if (price.equals(ZERO)) {
    return ZERO;
  }
  return usd.div(price);
}

export function convertAmountToUsd(
  tokenAddress: string,
  amount: BigInt,
  useMax: boolean = false
): BigInt {
  let price = getTokenPrice(tokenAddress, useMax);
  return amount.times(price);
}

function getMax(a: BigInt, b: BigInt): BigInt {
  return a > b ? a : b;
}

function getMin(a: BigInt, b: BigInt): BigInt {
  return a < b ? a : b;
}

function timestampToPeriodStart(timestamp: BigInt, period: string): BigInt {
  let seconds = periodToSeconds(period);
  return timestamp.div(seconds).times(seconds);
}

function periodToSeconds(period: string): BigInt {
  let seconds: BigInt;
  if (period == "1m") {
    seconds = BigInt.fromI32(1 * 60);
  } else if (period == "5m") {
    seconds = BigInt.fromI32(5 * 60);
  } else if (period == "15m") {
    seconds = BigInt.fromI32(15 * 60);
  } else if (period == "1h") {
    seconds = BigInt.fromI32(60 * 60);
  } else if (period == "4h") {
    seconds = BigInt.fromI32(4 * 60 * 60);
  } else if (period == "1d") {
    seconds = BigInt.fromI32(24 * 60 * 60);
  } else {
    throw new Error("Invalid period");
  }
  return seconds;
}

function getId(token: string, period: string, periodStart: BigInt): string {
  return token + ":" + period + ":" + periodStart.toString();
}

function updateCandle(eventData: EventData1, period: string): void {
  let event = new OraclePriceUpdateEventData(eventData);
  let candle = new Candle(event.token + ":" + event.timestamp.toString());
  let periodStart = timestampToPeriodStart(event.timestamp, period);
  let id = getId(event.token, period, periodStart);
  let entity = Candle.load(id);
  let price = event.maxPrice;

  if (!entity) {
    let prevId = getId(
      event.token,
      period,
      periodStart.minus(periodToSeconds(period))
    );
    let prevEntity = Candle.load(prevId);

    entity = new Candle(id);

    entity.period = period;

    if (!prevEntity) {
      entity.open = price;
    } else {
      entity.open = prevEntity.close;
    }
    entity.close = price;
    entity.high = getMax(entity.open, entity.close);
    entity.low = getMin(entity.open, entity.close);
    entity.timestamp = periodStart.toI32();
    entity.marketAddress = event.token;
  } else {
    entity.high = getMax(entity.high, price);
    entity.low = getMin(entity.low, price);
    entity.close = price;
  }

  entity.save();
}

export function handlePriceUpdate(event: EventData1): void {
  updateCandle(event, "1m");
  updateCandle(event, "5m");
  updateCandle(event, "15m");
  updateCandle(event, "1h");
  updateCandle(event, "4h");
  updateCandle(event, "1d");
}
