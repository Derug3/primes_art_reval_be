import { Injectable, OnModuleInit } from '@nestjs/common';
import { Connection } from '@solana/web3.js';
import { RPC_CONNECTIONS } from 'src/box_config/utilities/helpers';

@Injectable()
export class SharedService implements OnModuleInit {
  rpcConnections: Map<string, number>;

  constructor() {
    this.rpcConnections = new Map();
  }

  onModuleInit() {
    for (const rpcConnection of RPC_CONNECTIONS) {
      this.rpcConnections.set(rpcConnection, 0);
    }
  }

  getRpcConnection(): Connection {
    let [rpcConnection, usedTimes] = Array.from(this.rpcConnections)[0];

    for (const [key, value] of this.rpcConnections) {
      if (value < usedTimes) {
        rpcConnection = key;
        usedTimes = value;
      }
    }

    this.rpcConnections.set(rpcConnection, usedTimes + 1);
    return new Connection(rpcConnection);
  }
}
