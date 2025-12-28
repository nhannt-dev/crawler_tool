/**
 * Snowflake ID Generator
 * 
 * Snowflake ID là một thuật toán sinh ID phân tán được Twitter phát triển
 * Cấu trúc 64-bit:
 * - 41 bits: timestamp (milliseconds)
 * - 10 bits: machine id (5 bits datacenter + 5 bits worker)
 * - 12 bits: sequence number
 * 
 * Đảm bảo:
 * - Unique: ID duy nhất trong hệ thống phân tán
 * - Time-ordered: ID tăng dần theo thời gian
 * - High performance: Có thể sinh hàng nghìn ID/giây
 */

export class SnowflakeIdGenerator {
  private readonly epoch = 1609459200000n;

  private readonly datacenterIdBits = 5n;
  private readonly workerIdBits = 5n;
  private readonly sequenceBits = 12n;

  private readonly maxDatacenterId = (1n << this.datacenterIdBits) - 1n;
  private readonly maxWorkerId = (1n << this.workerIdBits) - 1n;
  private readonly maxSequence = (1n << this.sequenceBits) - 1n;

  private readonly workerIdShift = this.sequenceBits;
  private readonly datacenterIdShift = this.sequenceBits + this.workerIdBits;
  private readonly timestampLeftShift =
    this.sequenceBits + this.workerIdBits + this.datacenterIdBits;

  private sequence = 0n;
  private lastTimestamp = -1n;

  private datacenterId: bigint;
  private workerId: bigint;

  constructor(datacenterId: number, workerId: number) {
    if (datacenterId < 0 || BigInt(datacenterId) > this.maxDatacenterId) {
      throw new Error(`Datacenter ID must be 0 - ${this.maxDatacenterId}`);
    }

    if (workerId < 0 || BigInt(workerId) > this.maxWorkerId) {
      throw new Error(`Worker ID must be 0 - ${this.maxWorkerId}`);
    }

    this.datacenterId = BigInt(datacenterId);
    this.workerId = BigInt(workerId);
  }

  public generate(): string {
    let timestamp = this.currentTimestamp();

    if (timestamp < this.lastTimestamp) {
      throw new Error('Clock moved backwards');
    }

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & this.maxSequence;
      if (this.sequence === 0n) {
        timestamp = this.waitNextMillis(this.lastTimestamp);
      }
    } else {
      this.sequence = 0n;
    }

    this.lastTimestamp = timestamp;

    const id =
      ((timestamp - this.epoch) << this.timestampLeftShift) |
      (this.datacenterId << this.datacenterIdShift) |
      (this.workerId << this.workerIdShift) |
      this.sequence;

    return id.toString(); // stringify → không bao giờ âm
  }

  private currentTimestamp(): bigint {
    return BigInt(Date.now());
  }

  private waitNextMillis(lastTimestamp: bigint): bigint {
    let ts = this.currentTimestamp();
    while (ts <= lastTimestamp) {
      ts = this.currentTimestamp();
    }
    return ts;
  }
}


// Export singleton instance
const datacenterId = parseInt(process.env.DATACENTER_ID || '1');
const workerId = parseInt(process.env.WORKER_ID || '1');

export const snowflakeGenerator = new SnowflakeIdGenerator(datacenterId, workerId);
