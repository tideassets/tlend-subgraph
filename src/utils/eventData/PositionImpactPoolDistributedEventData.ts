import { BigInt } from "@graphprotocol/graph-ts";
import { EventData1 } from "../eventData1";

/*
market: 0x339eF6aAcF8F4B2AD15BdcECBEED1842Ec4dBcBf (address)
distributionAmount: 16278 (uint)
nextPositionImpactPoolAmount: 661876257 (uint)
*/

export class PositionImpactPoolDistributedEventData {
  constructor(private eventData: EventData1) {}

  get market(): string {
    return this.eventData.getAddressItemString("market")!;
  }

  get distributionAmount(): BigInt {
    return this.eventData.getUintItem("distributionAmount")!;
  }

  get nextPositionImpactPoolAmount(): BigInt {
    return this.eventData.getUintItem("nextPositionImpactPoolAmount")!;
  }
}
