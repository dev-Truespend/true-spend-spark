import {
  Text,
  Section,
  Button,
} from 'https://esm.sh/@react-email/components@0.0.22';
import * as React from 'https://esm.sh/react@18.3.1';
import { BaseEmailLayout } from './base-layout.tsx';

interface GeofenceAlertEmailProps {
  firstName: string;
  geofenceName: string;
  eventType: 'entry' | 'exit';
  address: string;
  timestamp: string;
  budgetLimit?: number;
  spentAtLocation?: number;
}

export const GeofenceAlertEmail = ({
  firstName,
  geofenceName,
  eventType,
  address,
  timestamp,
  budgetLimit,
  spentAtLocation,
}: GeofenceAlertEmailProps) => {
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

  const eventEmoji = eventType === 'entry' ? '📍' : '👋';
  const eventText = eventType === 'entry' ? 'entered' : 'left';
  const eventColor = eventType === 'entry' ? '#10B981' : '#6B7280';

  return (
    <BaseEmailLayout previewText={`You ${eventText} ${geofenceName}`}>
      <Text style={greeting}>Hi {firstName},</Text>
      
      <Section style={alertBox(eventColor)}>
        <Text style={alertIcon}>{eventEmoji}</Text>
        <Text style={alertTitle}>
          {eventType === 'entry' ? 'Location Entry' : 'Location Exit'}
        </Text>
        <Text style={alertSubtitle}>{geofenceName}</Text>
      </Section>

      <Text style={text}>
        You {eventText} <strong>{geofenceName}</strong> on {formattedDate} at {formattedTime}.
      </Text>

      <Section style={detailsBox}>
        <Text style={detail}>
          <span style={detailLabel}>Location:</span>
          <span style={detailValue}>{address}</span>
        </Text>
        <Text style={detail}>
          <span style={detailLabel}>Time:</span>
          <span style={detailValue}>{formattedDate} at {formattedTime}</span>
        </Text>
      </Section>

      {budgetLimit && spentAtLocation !== undefined && (
        <>
          <Text style={sectionTitle}>Spending at this location</Text>
          <Section style={budgetBox}>
            <Text style={budgetStat}>
              <span style={budgetLabel}>Total Spent:</span>
              <span style={budgetValue}>${spentAtLocation.toFixed(2)}</span>
            </Text>
            <Text style={budgetStat}>
              <span style={budgetLabel}>Budget Limit:</span>
              <span style={budgetValue}>${budgetLimit.toFixed(2)}</span>
            </Text>
            <Text style={budgetStat}>
              <span style={budgetLabel}>Remaining:</span>
              <span style={{
                ...budgetValue,
                color: (budgetLimit - spentAtLocation) < 0 ? '#DC2626' : '#10B981'
              }}>
                ${Math.abs(budgetLimit - spentAtLocation).toFixed(2)}
              </span>
            </Text>
          </Section>
        </>
      )}

      <Text style={text}>
        {eventType === 'entry' 
          ? 'Keep track of your spending while you\'re here!'
          : 'Thanks for using TrueSpend to track your spending!'
        }
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href="https://truespend.org/geofences">
          Manage Geofences
        </Button>
      </Section>
    </BaseEmailLayout>
  );
};

export default GeofenceAlertEmail;

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
  borderRadius: '12px',
  padding: '32px',
  margin: '24px 0',
  textAlign: 'center' as const,
});

const alertIcon = {
  fontSize: '48px',
  margin: '0 0 16px',
};

const alertTitle = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold' as const,
  margin: '0 0 8px',
};

const alertSubtitle = {
  color: '#666',
  fontSize: '18px',
  margin: '0',
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

const sectionTitle = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold' as const,
  margin: '24px 0 16px',
};

const budgetBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '20px',
  margin: '16px 0',
};

const budgetStat = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
  display: 'flex' as const,
  justifyContent: 'space-between' as const,
};

const budgetLabel = {
  fontWeight: '500' as const,
};

const budgetValue = {
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
