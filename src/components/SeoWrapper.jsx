import React from 'react';
import { Helmet } from 'react-helmet-async';

const SeoWrapper = ({ title, description, image, url }) => {
    const siteTitle = 'GoVyral - AI Social Media Caption Generator';
    const defaultDescription = 'Generate viral captions, hashtags, and posting times for Instagram, LinkedIn, Twitter, and Facebook using AI. The ultimate AI caption content creator for your viral vibe.';
    const defaultImage = 'https://govyral.online/og-image.png'; // Updated to govyral.online based on user screenshot
    const siteUrl = 'https://govyral.online';

    const finalTitle = title ? `${title} | GoVyral` : siteTitle;
    const finalDescription = description || defaultDescription;
    const finalImage = image || defaultImage;
    const finalUrl = url ? `${siteUrl}${url}` : siteUrl;

    // Structured Data (JSON-LD)
    const structuredData = [
        {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "GoVyral",
            "url": siteUrl,
            "logo": `${siteUrl}/logo.png`, // Assuming logo exists or will exist
            "sameAs": [
                "https://www.instagram.com/govyral", // Placeholder - user can update
                "https://twitter.com/govyral"      // Placeholder
            ]
        },
        {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "GoVyral",
            "url": siteUrl,
            "potentialAction": {
                "@type": "SearchAction",
                "target": `${siteUrl}/search?q={search_term_string}`,
                "query-input": "required name=search_term_string"
            }
        },
        {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "GoVyral",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
            },
            "description": finalDescription
        }
    ];

    return (
        <Helmet>
            {/* Basic Meta Tags */}
            <title>{finalTitle}</title>
            <meta name="description" content={finalDescription} />
            <meta name="keywords" content="AI caption generator, social media content creator, viral vibe, instagram captions, facebook posts, AI writer, GoVyral" />
            <link rel="canonical" href={finalUrl} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content="website" />
            <meta property="og:url" content={finalUrl} />
            <meta property="og:title" content={finalTitle} />
            <meta property="og:description" content={finalDescription} />
            <meta property="og:image" content={finalImage} />
            <meta property="og:site_name" content="GoVyral" />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={finalUrl} />
            <meta property="twitter:title" content={finalTitle} />
            <meta property="twitter:description" content={finalDescription} />
            <meta property="twitter:image" content={finalImage} />

            {/* Structured Data */}
            <script type="application/ld+json">
                {JSON.stringify(structuredData)}
            </script>
        </Helmet>
    );
};

export default SeoWrapper;
