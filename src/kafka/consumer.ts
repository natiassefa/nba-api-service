import { Kafka, logLevel, logCreator } from 'kafkajs';
import { cfg } from '../config.js';
import { logger } from '../logger.js';
import type { UpdateMessage } from '../types/messages.js';

/**
 * Custom log creator for KafkaJS that routes logs through Pino
 */
const kafkaLogCreator: logCreator = () => {
  return ({ level, log }) => {
    const { message, ...extra } = log;
    
    // Map KafkaJS log levels to Pino levels
    const levelMap: Record<number, 'error' | 'warn' | 'info' | 'debug'> = {
      [logLevel.ERROR]: 'error',
      [logLevel.WARN]: 'warn',
      [logLevel.INFO]: 'info',
      [logLevel.DEBUG]: 'debug',
    };
    
    const pinoLevel = levelMap[level] || 'info';
    
    // Format log data for Pino
    const logData: Record<string, unknown> = {
      logger: 'kafkajs',
      ...extra
    };
    
    // Use the message as the log message, or construct one from available fields
    const logMessage = message || extra.error || 'Kafka log';
    
    logger[pinoLevel](logData, logMessage);
  };
};

/**
 * Kafka consumer instance
 * 
 * Consumes messages from the game updates topic and processes them.
 * Uses a consumer group to allow multiple instances to share the load.
 */
const kafka = new Kafka({
  clientId: `${cfg.kafka.clientId}-consumer`,
  brokers: cfg.kafka.brokers,
  logLevel: logLevel.ERROR,
  logCreator: kafkaLogCreator
});

export const consumer = kafka.consumer({ 
  groupId: cfg.kafka.consumerGroupId || 'nba-api-consumer-group' 
});

/**
 * Callback type for processing update messages
 */
export type UpdateMessageHandler = (message: UpdateMessage) => Promise<void> | void;

let messageHandler: UpdateMessageHandler | null = null;
let isConsumerStarted = false;

/**
 * Sets the handler function that will be called for each Kafka message
 */
export function setMessageHandler(handler: UpdateMessageHandler) {
  messageHandler = handler;
}

/**
 * Checks if the Kafka consumer is started and ready
 */
export function isConsumerReady(): boolean {
  return isConsumerStarted;
}

/**
 * Connects the Kafka consumer and starts consuming messages
 */
export async function startConsumer() {
  await consumer.connect();
  logger.info('Kafka consumer connected');

  await consumer.subscribe({ 
    topic: cfg.kafka.topicUpdates,
    fromBeginning: false // Only consume new messages
  });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        if (!message.value) {
          logger.warn({ topic, partition }, 'Received message with no value');
          return;
        }

        const updateMessage: UpdateMessage = JSON.parse(message.value.toString());
        
        if (messageHandler) {
          await messageHandler(updateMessage);
        } else {
          logger.warn('No message handler set, message ignored');
        }
      } catch (err) {
        logger.error({ err, topic, partition }, 'Error processing Kafka message');
        // Don't throw - allow consumer to continue processing other messages
      }
    }
  });

  isConsumerStarted = true;
  logger.info({ topic: cfg.kafka.topicUpdates }, 'Kafka consumer started');
}

/**
 * Disconnects the Kafka consumer gracefully
 */
export async function stopConsumer() {
  await consumer.disconnect();
  isConsumerStarted = false;
  logger.info('Kafka consumer disconnected');
}

