import {
  Text,
  Section,
  Button,
} from 'https://esm.sh/@react-email/components@0.0.22';
import * as React from 'https://esm.sh/react@18.3.1';
import { BaseEmailLayout } from './base-layout.tsx';

interface WeeklySummaryEmailProps {
  firstName: string;
  weekStart: string;
  weekEnd: string;
  totalSpent: number;
  transactionCount: number;
  topCategory: string;
  topCategoryAmount: number;
  comparisonLastWeek: number; // percentage change
  budgetStatus: {
    onTrack: number;
    exceeded: number;
    approaching: number;
  };
}

export const WeeklySummaryEmail = ({
  firstName,
  weekStart,
  weekEnd,
  totalSpent,
  transactionCount,
  topCategory,
  topCategoryAmount,
  comparisonLastWeek,
  budgetStatus,
}: WeeklySummaryEmailProps) => {
  const startDate = new Date(weekStart).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const endDate = new Date(weekEnd).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const trendEmoji = comparisonLastWeek > 0 ? '📈' : comparisonLastWeek < 0 ? '📉' : '➡️';
  const trendText = comparisonLastWeek > 0 
    ? `${Math.abs(comparisonLastWeek)}% more than last week`
    : comparisonLastWeek < 0
    ? `${Math.abs(comparisonLastWeek)}% less than last week`
    : 'Same as last week';

  return (
    <BaseEmailLayout previewText={`Your weekly spending summary: $${totalSpent.toFixed(2)}`}>
      <Text style={greeting}>Hi {firstName},</Text>
      
      <Text style={text}>
        Here's your spending summary for {startDate} - {endDate}.
      </Text>

      <Section style={summaryBox}>
        <Text style={summaryTitle}>Total Spending</Text>
        <Text style={summaryAmount}>${totalSpent.toFixed(2)}</Text>
        <Text style={summarySubtext}>
          {trendEmoji} {trendText}
        </Text>
        <Text style={transactionCount}>
          {transactionCount} {transactionCount === 1 ? 'transaction' : 'transactions'}
        </Text>
      </Section>

      <Section style={statsContainer}>
        <Section style={statCard}>
          <Text style={statValue}>{topCategory}</Text>
          <Text style={statLabel}>Top Category</Text>
          <Text style={statAmount}>${topCategoryAmount.toFixed(2)}</Text>
        </Section>
      </Section>

      <Text style={sectionTitle}>Budget Status</Text>
      <Section style={budgetBox}>
        {budgetStatus.onTrack > 0 && (
          <Text style={budgetItem}>
            <span style={budgetIcon}>✅</span>
            <span style={budgetText}>{budgetStatus.onTrack} {budgetStatus.onTrack === 1 ? 'budget' : 'budgets'} on track</span>
          </Text>
        )}
        {budgetStatus.approaching > 0 && (
          <Text style={budgetItem}>
            <span style={budgetIcon}>⚠️</span>
            <span style={budgetText}>{budgetStatus.approaching} {budgetStatus.approaching === 1 ? 'budget' : 'budgets'} approaching limit</span>
          </Text>
        )}
        {budgetStatus.exceeded > 0 && (
          <Text style={budgetItem}>
            <span style={budgetIcon}>🚨</span>
            <span style={budgetText}>{budgetStatus.exceeded} {budgetStatus.exceeded === 1 ? 'budget' : 'budgets'} exceeded</span>
          </Text>
        )}
      </Section>

      <Text style={text}>
        Keep up the great work tracking your spending! View your full dashboard for more insights.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href="https://truespend.org/insights">
          View Full Report
        </Button>
      </Section>
    </BaseEmailLayout>
  );
};

export default WeeklySummaryEmail;

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

const summaryBox = {
  backgroundColor: '#4F46E5',
  borderRadius: '12px',
  padding: '32px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const summaryTitle = {
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '500' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 8px',
};

const summaryAmount = {
  color: '#ffffff',
  fontSize: '48px',
  fontWeight: 'bold' as const,
  margin: '8px 0',
};

const summarySubtext = {
  color: 'rgba(255, 255, 255, 0.9)',
  fontSize: '16px',
  margin: '8px 0',
};

const transactionCount = {
  color: 'rgba(255, 255, 255, 0.7)',
  fontSize: '14px',
  margin: '12px 0 0',
};

const statsContainer = {
  margin: '24px 0',
};

const statCard = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '20px',
  textAlign: 'center' as const,
};

const statValue = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold' as const,
  margin: '0 0 8px',
};

const statLabel = {
  color: '#666',
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 8px',
};

const statAmount = {
  color: '#4F46E5',
  fontSize: '24px',
  fontWeight: 'bold' as const,
  margin: '8px 0 0',
};

const sectionTitle = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold' as const,
  margin: '32px 0 16px',
};

const budgetBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '20px',
  margin: '16px 0',
};

const budgetItem = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '28px',
  margin: '8px 0',
};

const budgetIcon = {
  marginRight: '12px',
};

const budgetText = {
  fontWeight: '500' as const,
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
