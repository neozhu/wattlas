# Google Analytics Integration Design

## Goal

Add basic GA4 traffic measurement to Wattlas so the owner can see when and how many people visit the public site.

## Validated scope

Wattlas will load Google Analytics 4 globally using measurement ID `G-6QH4YS3Z6P`. The integration records standard GA4 page visits only. It will not add custom product-interaction events, a consent banner, advertising configuration, or user-profile data.

The optimized Next.js `GoogleAnalytics` component will be mounted once in the root App Router layout. The measurement ID will come from `NEXT_PUBLIC_GA_MEASUREMENT_ID`, allowing deployment configuration without changing application code. When the variable is absent, the analytics script will not load, keeping tests and unconfigured local development clean.

The existing metadata description will be corrected from daily-refreshed to monthly-refreshed to match the approved publishing cadence.

## Verification

Tests will assert that the root layout conditionally includes the configured GA component. The production build and live deployment will be checked, and the deployed HTML/script requests will be inspected for the configured GA ID. Final traffic verification occurs in GA4 Realtime after opening the production site.

