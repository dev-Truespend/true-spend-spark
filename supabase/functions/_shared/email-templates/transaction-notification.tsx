import {
  Text,
  Section,
  Button,
} from 'https://esm.sh/@react-email/components@0.0.22';
import * as React from 'https://esm.sh/react@18.3.1';
import { BaseEmailLayout } from './base-layout.tsx';

interface TransactionNotificationEmailProps {
  firstName: string;
  amount: number;
  merchantName: string;
  category: string;
  timestamp: string;
  location?: string;
  description?: string;
}

export const TransactionNotificationEmail = ({
  firstName,
  amount,
  merchantName,
  category,
  timestamp,
  location,
  description,
}: TransactionNotificationEmailProps) => {
  const date = new Date(timestamp);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <BaseEmailLayout previewText={`New transaction: $${amount.toFixed(2)} at ${merchantName}`}>
      <Text style={greeting}>Hi {firstName},</Text>
      
      <Text style={text}>
        A new transaction has been recorded on your account.
      </Text>

      <Section style={transactionBox}>
        <Text style={amountText}>${amount.toFixed(2)}</Text>
        <Text style={merchantText}>{merchantName}</Text>
        <Text style={categoryBadge}>{category}</Text>
      </Section>

      <Section style={detailsBox}>
        <Text style={detail}>
          <span style={detailLabel}>Date:</span>
          <span style={detailValue}>{formattedDate} at {formattedTime}</span>
        </Text>
        {location && (
          <Text style={detail}>
            <span style={detailLabel}>Location:</span>
            <span style={detailValue}>{location}</span>
          </Text>
        )}
        {description && (
          <Text style={detail}>
            <span style={detailLabel}>Description:</span>
            <span style={detailValue}>{description}</span>
          </Text>
        )}
      </Section>

      <Text style={text}>
        If you don't recognize this transaction, please review it immediately.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href="https://truespend.org/transactions">
          View Transaction
        </Button>
      </Section>
    </BaseEmailLayout>
  );
};

export default TransactionNotificationEmail;

const greeting = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 24px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const transactionBox = {
  backgroundColor: '#4F46E5',
  borderRadius: '12px',
  padding: '32px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const amountText = {
  color: '#ffffff',
  fontSize: '36px',
  fontWeight: 'bold' as const,
  margin: '0 0 8px',
};

const merchantText = {
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: '500' as const,
  margin: '8px 0',
};

const categoryBadge = {
  display: 'inline-block' as const,
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '500' as const,
  padding: '6px 16px',
  borderRadius: '20px',
  margin: '12px 0 0',
};

const detailsBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const detail = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
  display: 'flex' as const,
  justifyContent: 'space-between' as const,
};

const detailLabel = {
  fontWeight: '500' as const,
  color: '#666',
};

const detailValue = {
  fontWeight: '500' as const,
  color: '#333',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#4F46E5',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold' as const,
  textDecoration: 'none' as const,
  textAlign: 'center' as const,
  display: 'inline-block' as const,
  padding: '12px 32px',
};
