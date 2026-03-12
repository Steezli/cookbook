import React from 'react';
import { ScrollView, Text, View, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Head from 'expo-router/head';

import {
  bgPage,
  fontFamilyBody,
  fontFamilyBodyMedium,
  fontFamilyDisplay,
  textPrimary,
  textSecondary,
  white,
} from '@/lib/tokens';
import { SITE_NAME } from '@/lib/site-config';

const EFFECTIVE_DATE = 'March 11, 2026';
const CONTACT_EMAIL = 'eli9nicholson@gmail.com';
const APP_NAME = SITE_NAME;
const ENTITY_NAME = SITE_NAME;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  return (
    <>
      {Platform.OS === 'web' && (
        <Head>
          <title>Privacy Policy — {APP_NAME}</title>
          <meta name="description" content={`Privacy Policy for the ${APP_NAME} app.`} />
        </Head>
      )}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Privacy Policy</Text>
        <Text style={styles.effectiveDate}>Effective date: {EFFECTIVE_DATE}</Text>

        <Section title="1. Introduction">
          <P>
            {ENTITY_NAME} ("we", "us", or "our") operates the {APP_NAME} mobile application and
            website (the "Service"). This Privacy Policy explains how we collect, use, disclose, and
            safeguard your information when you use our Service.
          </P>
        </Section>

        <Section title="2. Information We Collect">
          <P>We collect information you provide directly:</P>
          <Bullet>Account information: email address, display name, and password when you create an account.</Bullet>
          <Bullet>Recipe content: recipes, photos, ingredients, instructions, and other content you create or upload.</Bullet>
          <Bullet>Family spaces: information about family groups you create or join.</Bullet>

          <P>We collect information automatically:</P>
          <Bullet>Device information: device type, operating system, and unique device identifiers.</Bullet>
          <Bullet>Usage data: features you use, actions you take, and time spent in the app.</Bullet>
          <Bullet>Advertising identifiers: with your consent, we may collect your device's advertising identifier (IDFA on iOS, GAID on Android) for personalized advertising.</Bullet>
        </Section>

        <Section title="3. How We Use Your Information">
          <Bullet>To provide, maintain, and improve the Service.</Bullet>
          <Bullet>To process your recipe scans using AI-powered text extraction.</Bullet>
          <Bullet>To enable sharing recipes within family spaces you create or join.</Bullet>
          <Bullet>To display advertisements, including personalized ads when you have given consent.</Bullet>
          <Bullet>To communicate with you about the Service.</Bullet>
          <Bullet>To comply with legal obligations.</Bullet>
        </Section>

        <Section title="4. Advertising and Cookies">
          <P>
            We use Google AdMob to display advertisements. AdMob may use cookies and similar
            technologies to serve ads based on your prior visits to our Service or other websites.
          </P>
          <P>
            You can opt out of personalized advertising at any time through the consent controls in
            the app. On iOS, we request your permission via Apple's App Tracking Transparency
            framework before collecting advertising identifiers. In the European Economic Area (EEA)
            and UK, we request your consent via a GDPR-compliant consent form before showing
            personalized ads.
          </P>
          <P>
            For more information about how Google uses data, visit:{' '}
            https://policies.google.com/technologies/partner-sites
          </P>
        </Section>

        <Section title="5. Data Sharing">
          <P>We do not sell your personal information. We may share information with:</P>
          <Bullet>Service providers: Supabase (hosting, database, authentication), Google (advertising, AI services), Anthropic (recipe text extraction).</Bullet>
          <Bullet>Other users: recipes you mark as "public" are visible to all users. Recipes marked "family" are visible to members of the associated family space.</Bullet>
          <Bullet>Legal requirements: when required by law, regulation, or legal process.</Bullet>
        </Section>

        <Section title="6. Data Retention">
          <P>
            We retain your account information and content for as long as your account is active. You
            may delete your recipes at any time. If you delete your account, we will delete your
            personal data within 30 days, except where retention is required by law.
          </P>
        </Section>

        <Section title="7. Data Security">
          <P>
            We use industry-standard security measures including encrypted connections (TLS),
            row-level security policies on our database, and secure authentication. However, no
            method of electronic transmission or storage is 100% secure.
          </P>
        </Section>

        <Section title="8. Your Rights">
          <P>Depending on your jurisdiction, you may have the right to:</P>
          <Bullet>Access the personal data we hold about you.</Bullet>
          <Bullet>Request correction of inaccurate data.</Bullet>
          <Bullet>Request deletion of your data.</Bullet>
          <Bullet>Withdraw consent for personalized advertising.</Bullet>
          <Bullet>Object to processing of your data.</Bullet>
          <Bullet>Request data portability.</Bullet>
          <P>
            To exercise these rights, contact us at {CONTACT_EMAIL}.
          </P>
        </Section>

        <Section title="9. Children's Privacy">
          <P>
            Our Service is not directed to children under 13. We do not knowingly collect personal
            information from children under 13. If we become aware that we have collected data from a
            child under 13, we will delete it promptly.
          </P>
        </Section>

        <Section title="10. Changes to This Policy">
          <P>
            We may update this Privacy Policy from time to time. We will notify you of material
            changes by posting the new policy in the app with an updated effective date.
          </P>
        </Section>

        <Section title="11. Contact Us">
          <P>
            If you have questions about this Privacy Policy, contact us at {CONTACT_EMAIL}.
          </P>
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: bgPage,
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  heading: {
    fontFamily: fontFamilyDisplay,
    fontSize: 28,
    color: textPrimary,
    marginBottom: 4,
  },
  effectiveDate: {
    fontFamily: fontFamilyBody,
    fontSize: 14,
    color: textSecondary,
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: fontFamilyBodyMedium,
    fontSize: 18,
    color: textPrimary,
    marginBottom: 8,
  },
  body: {
    fontFamily: fontFamilyBody,
    fontSize: 15,
    color: textPrimary,
    lineHeight: 22,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    paddingLeft: 12,
    marginBottom: 4,
  },
  bulletDot: {
    fontFamily: fontFamilyBody,
    fontSize: 15,
    color: textSecondary,
    width: 16,
  },
  bulletText: {
    fontFamily: fontFamilyBody,
    fontSize: 15,
    color: textPrimary,
    lineHeight: 22,
    flex: 1,
  },
});
