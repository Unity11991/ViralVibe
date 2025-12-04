import React from 'react';
import { Helmet } from 'react-helmet-async';

const SeoWrapper = ({ title, description, image, url }) => {
    const siteTitle = 'GoVyral - AI Social Media Caption Generator';
    const defaultDescription = 'Generate viral captions, hashtags, and posting times for Instagram, LinkedIn, Twitter, and TikTok using AI.';
    const defaultImage = 'https://govyral.ai/og-image.png'; // Placeholder, ideally replace with real URL
    const siteUrl = 'https://govyral.ai';

    const finalTitle = title ? `${title} | GoVyral` : siteTitle;
    const finalDescription = description || defaultDescription;
    const finalImage = image || defaultImage;
    const finalUrl = url ? `${siteUrl}${url}` : siteUrl;

    return (
        <Helmet>
            {/* Basic Meta Tags */}
            <title>{finalTitle}</title>
            <meta name="description" content={finalDescription} />
            <link rel="canonical" href={finalUrl} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content="website" />
            <meta property="og:url" content={finalUrl} />
            <meta property="og:title" content={finalTitle} />
            <meta property="og:description" content={finalDescription} />
            <meta property="og:image" content={finalImage} />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={finalUrl} />
            <meta property="twitter:title" content={finalTitle} />
            <meta property="twitter:description" content={finalDescription} />
            <meta property="twitter:image" content={finalImage} />
        </Helmet>
    );
};

export default SeoWrapper;
