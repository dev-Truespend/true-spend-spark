import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Preview,
} from 'https://esm.sh/@react-email/components@0.0.22';
import * as React from 'https://esm.sh/react@18.3.1';

interface BaseEmailLayoutProps {
  children: React.ReactNode;
  previewText: string;
}

export const BaseEmailLayout = ({
  children,
  previewText,
}: BaseEmailLayoutProps) => (
  <Html>
    <Head />
    <Preview>{previewText}</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* TrueSpend Logo/Header */}
        <Section style={header}>
          <Text style={brandName}>TrueSpend</Text>
          <Text style={tagline}>Smart spending, simplified</Text>
        </Section>

        {/* Main Content */}
        <Section style={content}>
          {children}
        </Section>

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            Manage your notification preferences in Settings → Notifications
          </Text>
          <Text style={footerText}>
            © {new Date().getFullYear()} TrueSpend. All rights reserved.
          </Text>
          <Text style={footerLinks}>
            <Link href="https://truespend.org/privacy" style={link}>Privacy Policy</Link>
            {' • '}
            <Link href="https://truespend.org/terms" style={link}>Terms</Link>
            {' • '}
            <Link href="https://truespend.org/help" style={link}>Help</Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default BaseEmailLayout;

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
  maxWidth: '600px',
  borderRadius: '8px',
};

const header = {
  padding: '32px 24px 24px',
  borderBottom: '1px solid #e6e6e6',
  textAlign: 'center' as const,
};

const brandName = {
  color: '#4F46E5',
  fontSize: '32px',
  fontWeight: 'bold' as const,
  margin: '0 0 8px',
  padding: '0',
};

const tagline = {
  color: '#666',
  fontSize: '14px',
  margin: '0',
  padding: '0',
};

const content = {
  padding: '32px 24px',
};

const footer = {
  padding: '24px',
  borderTop: '1px solid #e6e6e6',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '8px 0',
};

const footerLinks = {
  color: '#8898aa',
  fontSize: '12px',
  margin: '12px 0',
};

const link = {
  color: '#4F46E5',
  textDecoration: 'none' as const,
};
