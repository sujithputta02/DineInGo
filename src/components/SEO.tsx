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
  description = 'DineInGo is the ultimate platform for effortless dining and event reservations. Find the best restaurants, book tables, and manage your events seamlessly.',
  keywords = 'dining, reservations, events, restaurants, book table, waitlist, DineInGo',
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
      {/* <meta name="msvalidate.01" content="YOUR_BING_VERIFICATION_CODE" /> */}
    </Helmet>
  );
};

export default SEO;
