import {
  SubstrateExtrinsic,
  SubstrateEvent,
  SubstrateBlock,
} from "@subql/types";
import { Account, Transfer, RedeemAccount, Redeemed } from "../types";
import { Balance } from "@polkadot/types/interfaces";
import { decodeAddress } from "@polkadot/util-crypto";

export async function handleBlock(block: SubstrateBlock): Promise<void> {
  // Do something with each block handler here
}

export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
  // Do something with a call handler here
}

export async function handleEvent(event: SubstrateEvent): Promise<void> {
  logger.info(
    `New transfer event found at block ${event.block.block.header.number.toString()}`,
  );

  // Get data from the event
  // The balances.transfer event has the following payload \[from, to, value\]
  // logger.info(JSON.stringify(event));
  const {
    event: {
      data: [from, to, amount],
    },
  } = event;

  const blockNumber: number = event.block.block.header.number.toNumber();

  const fromAccount = await checkAndGetAccount(from.toString(), blockNumber);
  const toAccount = await checkAndGetAccount(to.toString(), blockNumber);

  // Create the new transfer entity
  const transfer = Transfer.create({
    id: `${event.block.block.header.number.toNumber()}-${event.idx}`,
    blockNumber,
    date: event.block.timestamp,
    fromId: fromAccount.id,
    toId: toAccount.id,
    amount: (amount as Balance).toBigInt(),
  });

  fromAccount.lastTransferBlock = blockNumber;
  toAccount.lastTransferBlock = blockNumber;

  await Promise.all([fromAccount.save(), toAccount.save(), transfer.save()]);
}

async function checkAndGetAccount(
  id: string,
  blockNumber: number,
): Promise<Account> {
  let account = await Account.get(id.toLowerCase());
  if (!account) {
    // We couldn't find the account
    account = Account.create({
      id: id.toLowerCase(),
      publicKey: decodeAddress(id).toString().toLowerCase(),
      firstTransferBlock: blockNumber,
    });
  }
  return account;
}

export async function handleRedeemEvent(event: SubstrateEvent): Promise<void> {
  logger.info(
    `New transfer event found at block ${event.block.block.header.number.toString()}`,
  );

  // Get data from the event
  // The balances.transfer event has the following payload \[from, to, value\]
  // logger.info(JSON.stringify(event));
  const {
    event: {
      data: [address, token_id, vtoken_amount, token_amount, fee, unlock_id],
    },
  } = event;

  const blockNumber: number = event.block.block.header.number.toNumber();

  const who = await checkAndGetRedeemAccount(address.toString(), blockNumber);

  // Create the new transfer entity
  const transfer = Redeemed.create({
    id: `${event.block.block.header.number.toNumber()}-${event.idx}`,
    blockNumber,
    date: event.block.timestamp,
    whoId: who.id,
    vtoken_amount: (vtoken_amount as Balance).toBigInt(),
    token_amount: (token_amount as Balance).toBigInt(),
  });

  who.lastRedeemBlock = blockNumber;

  await Promise.all([who.save(), transfer.save()]);
}

async function checkAndGetRedeemAccount(
  id: string,
  blockNumber: number,
): Promise<RedeemAccount> {
  let account = await RedeemAccount.get(id);
  if (!account) {
    // We couldn't find the account
    account = RedeemAccount.create({
      id: id,
      publicKey: decodeAddress(id).toString(),
      firstRedeemBlock: blockNumber,
    });
  }
  return account;
}