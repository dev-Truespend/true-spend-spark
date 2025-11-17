import {
  Text,
  Section,
  Button,
} from 'https://esm.sh/@react-email/components@0.0.22';
import * as React from 'https://esm.sh/react@18.3.1';
import { BaseEmailLayout } from './base-layout.tsx';

interface BudgetAlertEmailProps {
  firstName: string;
  budgetName: string;
  currentSpent: number;
  budgetLimit: number;
  percentage: number;
  period: string;
  category: string;
}

export const BudgetAlertEmail = ({
  firstName,
  budgetName,
  currentSpent,
  budgetLimit,
  percentage,
  period,
  category,
}: BudgetAlertEmailProps) => {
  const alertLevel = percentage >= 100 ? 'exceeded' : percentage >= 90 ? 'critical' : 'warning';
  const alertColor = alertLevel === 'exceeded' ? '#DC2626' : alertLevel === 'critical' ? '#F59E0B' : '#EAB308';

  return (
    <BaseEmailLayout previewText={`Budget Alert: ${percentage}% of ${budgetName}`}>
      <Text style={greeting}>Hi {firstName},</Text>
      
      <Section style={alertBox(alertColor)}>
        <Text style={alertTitle}>
          {alertLevel === 'exceeded' ? '⚠️ Budget Exceeded' : `⚠️ ${percentage}% Budget Alert`}
        </Text>
        <Text style={alertSubtitle}>{budgetName}</Text>
      </Section>

      <Text style={text}>
        You've spent <strong>${currentSpent.toFixed(2)}</strong> out of your <strong>${budgetLimit.toFixed(2)}</strong> budget 
        for <strong>{category}</strong> this {period}.
      </Text>

      <Section style={statsBox}>
        <Text style={stat}>
          <span style={statLabel}>Current Spending:</span>
          <span style={statValue}>${currentSpent.toFixed(2)}</span>
        </Text>
        <Text style={stat}>
          <span style={statLabel}>Budget Limit:</span>
          <span style={statValue}>${budgetLimit.toFixed(2)}</span>
        </Text>
        <Text style={stat}>
          <span style={statLabel}>Percentage Used:</span>
          <span style={{...statValue, color: alertColor}}>{percentage}%</span>
        </Text>
        {alertLevel === 'exceeded' && (
          <Text style={stat}>
            <span style={statLabel}>Over Budget:</span>
            <span style={{...statValue, color: alertColor}}>${(currentSpent - budgetLimit).toFixed(2)}</span>
          </Text>
        )}
      </Section>

      <Text style={text}>
        {alertLevel === 'exceeded' 
          ? 'Consider reviewing your spending or adjusting your budget to stay on track.'
          : 'You might want to review your spending to avoid exceeding your budget.'
        }
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href="https://truespend.org/budgets">
          View Budget Details
        </Button>
      </Section>
    </BaseEmailLayout>
  );
};

export default BudgetAlertEmail;

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

const alertBox = (color: string) => ({
  backgroundColor: `${color}10`,
  border: `2px solid ${color}`,
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
});

const alertTitle = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold' as const,
  margin: '0 0 8px',
};

const alertSubtitle = {
  color: '#666',
  fontSize: '16px',
  margin: '0',
};

const statsBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const stat = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
  display: 'flex' as const,
  justifyContent: 'space-between' as const,
};

const statLabel = {
  fontWeight: '500' as const,
};

const statValue = {
  fontWeight: 'bold' as const,
  color: '#4F46E5',
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
