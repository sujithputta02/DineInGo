import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

const SEO: React.FC<SEOProps> = ({
  title = 'DineInGo - Reserve Dining & Events',
  description = 'DineInGo - India\'s first truly interactive restaurant and event booking platform. Reserve exact tables with real-time floor plans, manage waitlists, and discover top-tier dining experiences.',
  keywords = 'DineInGo, restaurant reservations India, book exact table, real-time floor plan, event booking app, waitlist management system, table booking Mumbai, table booking Bangalore, restaurant management software',
  image = '/images/Di logo.svg',
  url = 'https://dine-in-go.vercel.app',
  type = 'website',
}) => {
  const siteTitle = title.includes('DineInGo') ? title : `${title} | DineInGo`;

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={siteTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />

      {/* Canonical Link */}
      <link rel="canonical" href={url} />

      {/* Search Engine Verification */}
      <meta name="google-site-verification" content="48CMPDSRmR5N-sjGbP5OlnFHhuikcw3XYsPhRI7Ctcc" />
      <meta name="google-site-verification" content="BMpd1amFjj5-utNNTbYNrqvyDnWwHaP78O7Iu1ZraQE" />
      {/* <meta name="msvalidate.01" content="YOUR_BING_VERIFICATION_CODE" /> */}
    </Helmet>
  );
};

export default SEO;
