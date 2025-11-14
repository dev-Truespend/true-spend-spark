import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface SecurityAlertEmailProps {
  firstName: string;
  alertType: 'many_failed_attempts' | 'password_changed' | 'account_locked';
  details?: {
    attemptCount?: number;
    ipAddress?: string;
    timestamp?: string;
  };
}

export const SecurityAlertEmail = ({
  firstName,
  alertType,
  details = {},
}: SecurityAlertEmailProps) => {
  const getAlertContent = () => {
    switch (alertType) {
      case 'many_failed_attempts':
        return {
          subject: 'Unusual sign-in activity detected',
          heading: 'Security Alert: Multiple Failed Sign-In Attempts',
          message: `We detected ${details.attemptCount || 'multiple'} failed sign-in attempts on your TrueSpend account${details.ipAddress ? ` from IP address ${details.ipAddress}` : ''}.`,
          action: 'If this was not you, we recommend changing your password immediately.',
        };
      case 'password_changed':
        return {
          subject: 'Your password was changed',
          heading: 'Password Changed Successfully',
          message: 'Your TrueSpend password was successfully changed.',
          action: 'If you did not make this change, contact our support team immediately.',
        };
      case 'account_locked':
        return {
          subject: 'Your account has been locked',
          heading: 'Account Locked for Security',
          message: 'Your TrueSpend account has been temporarily locked due to too many failed sign-in attempts.',
          action: 'You can unlock your account by resetting your password.',
        };
      default:
        return {
          subject: 'Security alert',
          heading: 'Security Alert',
          message: 'We detected unusual activity on your TrueSpend account.',
          action: 'Please review your account security settings.',
        };
    }
  };

  const content = getAlertContent();

  return (
    <Html>
      <Head />
      <Preview>{content.subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{content.heading}</Heading>
          <Text style={text}>Hi {firstName},</Text>
          <Section style={alertBox}>
            <Text style={alertText}>{content.message}</Text>
          </Section>
          <Text style={text}>{content.action}</Text>
          {alertType !== 'password_changed' && (
            <Section style={buttonContainer}>
              <Button style={button} href={`${Deno.env.get('SITE_URL') || 'https://truespend.lovable.app'}/forgot-password`}>
                Reset Password
              </Button>
            </Section>
          )}
          <Text style={footer}>
            <strong>Time:</strong> {details.timestamp || new Date().toLocaleString()}
          </Text>
          {details.ipAddress && (
            <Text style={footer}>
              <strong>IP Address:</strong> {details.ipAddress}
            </Text>
          )}
          <Text style={footer}>
            If you have any concerns, please contact our support team.
          </Text>
          <Text style={footer}>
            — The TrueSpend Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default SecurityAlertEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 24px',
};

const alertBox = {
  backgroundColor: '#fff3cd',
  border: '1px solid #ffc107',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 24px',
};

const alertText = {
  color: '#856404',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
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
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 24px 0',
};
