import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Bransion',
  description: 'How Bransion collects, protects, and processes your data.',
};

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="text-xs text-muted-foreground">
        Effective Date: November 28, 2026 · Last Updated: November 28, 2026
        <br />
        Entity: Bransion (a venture operating within the Birova / Bureauverse
        ecosystem, founded by Emmanuel Chimezie Chukwumalume)
        <br />
        Website: <a href="https://bransion.com">https://bransion.com</a>
      </p>

      <h2>1. Introduction, Philosophy, and Psychological Commitment to Trust</h2>
      <p>
        At Bransion, we recognize that brand identity is deeply personal. When
        you entrust us with your custom apparel vision, intellectual property,
        artwork, and personal contact details, you are not merely placing an
        e-commerce order—you are inviting us into your creative and commercial
        journey. From a human-centric perspective, trust is the bedrock of every
        lasting brand relationship. Anxiety over how digital platforms handle
        uploaded designs, payment credentials, and personal information creates
        friction that undermines creativity.
      </p>
      <p>
        Accordingly, this Privacy Policy is designed not as an opaque wall of
        defensive legalese, but as a clear, transparent covenant between Bransion
        and you (&quot;User,&quot; &quot;Customer,&quot; &quot;Creator,&quot; or
        &quot;Client&quot;). This document governs how Bransion collects,
        processes, stores, shares, and protects your Personal Data and Custom
        Intellectual Property when you access bransion.com, customize apparel
        mockups, place orders, or interact with our brand across digital
        channels.
      </p>
      <p>
        This Privacy Policy complies with the Nigeria Data Protection Act (NDPA)
        2023, regulations issued by the Nigeria Data Protection Commission
        (NDPC), and internationally recognized privacy standards including the
        General Data Protection Regulation (GDPR) and the California Consumer
        Privacy Act (CCPA) where applicable to our international clients.
      </p>

      <h2>2. Data Controller Identity and Ecosystem Structure</h2>
      <p>
        For the purposes of applicable data protection legislation, Bransion is
        the Data Controller responsible for determining the purposes and means of
        processing your personal data collected via bransion.com.
      </p>
      <ul>
        <li><strong>Brand Name:</strong> Bransion (bransion.com)</li>
        <li><strong>Parent / Venture Studio Ecosystem:</strong> Birova (Bureauverse)</li>
        <li><strong>Operational Headquarters:</strong> Lagos State, Federal Republic of Nigeria</li>
        <li><strong>Privacy &amp; Data Protection Contact:</strong> privacy@bransion.com / support@bransion.com</li>
      </ul>

      <h2>3. Comprehensive Categories of Data We Collect</h2>
      <p>
        Because Bransion bridges digital product customization with physical
        apparel manufacturing and fulfillment, we collect distinct categories of
        information tailored strictly to delivering a seamless experience:
      </p>

      <h3>A. Identity and Contact Data</h3>
      <ul>
        <li>Full name (first name, middle name, surname) or business/brand name.</li>
        <li>Email address (used for account authentication, order tracking, mockup approvals, and transactional receipts).</li>
        <li>Telephone and WhatsApp numbers (used for urgent delivery coordination, print-readiness clarifications, and customer support).</li>
        <li>Billing and physical shipping/delivery addresses (street address, city, state/province, postal code, and country).</li>
      </ul>

      <h3>B. Custom Design, Apparel Specifications, and Intellectual Property Data</h3>
      <ul>
        <li><strong>Uploaded Artwork &amp; Logos:</strong> Vector files, PNGs, JPEGs, brand marks, typography, and custom graphics uploaded by you to replace placeholder templates (such as our standard &quot;Style&quot; sub-style preview indicators).</li>
        <li><strong>Customization Metadata:</strong> Apparel types (e.g., T-shirts, hoodies, corporate wear), fabric tiers, sizing breakdowns, color selections, and placement coordinates (front, back, side chest, sleeve, or neck tag).</li>
        <li><strong>Communication &amp; Revision Logs:</strong> Notes, feedback, and approval confirmations exchanged during the pre-print proofing stage.</li>
      </ul>

      <h3>C. Financial and Transaction Data</h3>
      <ul>
        <li>Order history, itemized invoices, pricing tier selections, discount codes used, and transaction timestamps.</li>
        <li>Payment confirmation tokens, transaction references, and partial payment method identifiers provided by our third-party payment gateways.</li>
        <li><strong>Strict Non-Storage of Sensitive Card Credentials:</strong> Bransion never directly collects, processes, or stores your raw debit/credit card numbers, CVV codes, or banking passwords on our servers. All financial transactions are encrypted and handled directly by PCI-DSS compliant payment processors.</li>
      </ul>

      <h3>D. Account Authentication and Technical Telemetry Data</h3>
      <ul>
        <li>Encrypted account credentials or OAuth authentication tokens (when signing in via third-party identity providers such as Google OAuth).</li>
        <li>Internet Protocol (IP) address, browser type and version, operating system, device type (mobile or desktop), screen resolution, and time zone settings.</li>
        <li>Session diagnostics, page load performance metrics, referral URLs, and interaction logs on bransion.com used to maintain platform stability and security.</li>
      </ul>

      <h2>4. How and Why We Process Your Data (Lawful Bases)</h2>
      <p>
        Under Section 25 of the Nigeria Data Protection Act (NDPA) 2023 and
        Article 6 of the GDPR, we only process your personal data when we have a
        valid legal basis:
      </p>
      <table>
        <thead>
          <tr>
            <th>Processing Purpose</th>
            <th>Categories of Data Involved</th>
            <th>Lawful Basis for Processing</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Order Fulfillment &amp; Custom Apparel Production</td>
            <td>Identity, Contact, Shipping Address, Uploaded Artwork, Apparel Specs</td>
            <td>Performance of a Contract (necessary to manufacture and deliver your custom order)</td>
          </tr>
          <tr>
            <td>Account Creation &amp; OAuth Authentication</td>
            <td>Name, Email, OAuth Tokens, Encrypted Credentials</td>
            <td>Performance of a Contract &amp; Consent</td>
          </tr>
          <tr>
            <td>Payment Processing &amp; Fraud Prevention</td>
            <td>Transaction References, Billing Details, IP Address</td>
            <td>Performance of a Contract, Legal Obligation, &amp; Legitimate Interests</td>
          </tr>
          <tr>
            <td>Pre-Print Quality Assurance &amp; Customer Support</td>
            <td>Contact Data, WhatsApp/Phone, Design Files, Revision Logs</td>
            <td>Performance of a Contract &amp; Legitimate Interests</td>
          </tr>
          <tr>
            <td>Platform Security, Hosting &amp; Performance Optimization</td>
            <td>IP Address, Device/Browser Telemetry, Error Logs</td>
            <td>Legitimate Interests (ensuring site uptime, SSL integrity, and cyber defense)</td>
          </tr>
          <tr>
            <td>Tax, Accounting &amp; Regulatory Compliance</td>
            <td>Invoices, Order History, Identity Data</td>
            <td>Legal Obligation (compliance with Nigerian tax and commercial laws)</td>
          </tr>
          <tr>
            <td>Promotional Campaigns &amp; Brand Updates</td>
            <td>Name, Email, WhatsApp Number, Purchase Preferences</td>
            <td>Explicit Consent (opt-in only, with instant opt-out at any time)</td>
          </tr>
        </tbody>
      </table>

      <h2>5. Protection of Your Custom Designs &amp; Intellectual Property</h2>
      <p>
        We understand a critical psychological concern for founders, creators, and
        businesses using custom apparel platforms: &quot;Will my proprietary brand
        logo or original artwork be stolen, resold, or leaked before my
        launch?&quot; Bransion enforces strict operational and legal safeguards
        over your creative assets:
      </p>
      <ul>
        <li><strong>Exclusive Ownership:</strong> You retain 100% ownership and copyright over all original logos, trademarks, and designs you upload to bransion.com.</li>
        <li><strong>Purpose-Limited Access:</strong> Your design files are accessed strictly by authorized Bransion pre-press technicians and our vetted physical printing fulfillment partners solely for the purpose of executing your specific print order.</li>
        <li><strong>No Unauthorized Commercial Use:</strong> Bransion will never sell, license, replicate, or publicly showcase your custom branded apparel in our marketing materials, social media campaigns (TikTok, Instagram, X, YouTube, WhatsApp), or public catalogs without your explicit prior written consent.</li>
      </ul>

      <h2>6. Third-Party Infrastructure, Processors, and Data Sharing</h2>
      <p>
        Bransion operates on a modern, cloud-native architecture and collaborates
        with specialized physical fulfillment and logistics partners. We do not
        sell, rent, or trade your personal data to data brokers or third-party
        advertisers. We share data strictly on a need-to-know basis with the
        following categories of trusted Data Processors:
      </p>
      <ul>
        <li><strong>Cloud Hosting &amp; Edge Delivery Infrastructure (Vercel):</strong> Hosts the bransion.com web application, manages global edge caching, enforces HTTPS/SSL encryption, and processes transient server logs.</li>
        <li><strong>Database &amp; Authentication Infrastructure (Supabase &amp; Google Cloud OAuth):</strong> Securely stores user profiles, order records, customization configurations, and manages secure OAuth sign-in flows.</li>
        <li><strong>Domain &amp; DNS Management (Namecheap):</strong> Manages domain resolution and routing security for bransion.com.</li>
        <li><strong>Physical Printing &amp; Production Partners:</strong> Vetted apparel printing specialists who receive only the print-ready artwork, garment specifications, and order ID required to produce your merchandise under strict confidentiality obligations.</li>
        <li><strong>Logistics &amp; Delivery Couriers:</strong> Dispatch riders and nationwide/international shipping partners who receive your name, phone number, and delivery address strictly to complete physical delivery.</li>
        <li><strong>Payment Gateways:</strong> Regulated financial processors who handle checkout payments securely.</li>
      </ul>

      <h2>7. International Data Transfers</h2>
      <p>
        Because Bransion utilizes world-class cloud infrastructure (such as Vercel
        and Supabase) whose servers may be located outside Nigeria (including in
        the United States and the European Economic Area), your data may be
        transferred and stored internationally.
      </p>
      <p>
        In compliance with Part VI of the NDPA 2023, Bransion ensures that all
        cross-border data transfers occur only to jurisdictions with adequate data
        protection laws or are governed by binding contractual safeguards (such as
        Standard Contractual Clauses) that guarantee your data receives a level of
        protection equivalent to Nigerian statutory standards.
      </p>

      <h2>8. Data Security Architecture</h2>
      <p>
        We implement layered technical and organizational measures to protect your
        personal data and design assets against unauthorized access, alteration,
        disclosure, or destruction:
      </p>
      <ul>
        <li><strong>Transport Layer Encryption:</strong> All data transmitted between your browser and bransion.com is encrypted in transit using industry-standard TLS/SSL certificates.</li>
        <li><strong>Database Access Controls:</strong> Strict Row-Level Security (RLS) policies, encrypted storage, and role-based access controls ensure that users can only access their own account data and orders.</li>
        <li><strong>Principle of Least Privilege:</strong> Internal and fulfillment partner access to customer files is restricted strictly to personnel actively processing an order.</li>
        <li><strong>Breach Notification Protocol:</strong> In the unlikely event of a personal data breach that poses a high risk to your rights and freedoms, Bransion will notify the Nigeria Data Protection Commission (NDPC) within 72 hours and communicate transparently with affected users in accordance with Section 40 of the NDPA 2023.</li>
      </ul>

      <h2>9. Data Retention Schedule</h2>
      <p>
        We retain personal data only for as long as necessary to fulfill the
        purposes outlined in this policy or to satisfy statutory obligations:
      </p>
      <ul>
        <li><strong>Active Account &amp; Customization Profiles:</strong> Retained while your account remains active so you can easily reorder past apparel batches without re-uploading artwork.</li>
        <li><strong>Order &amp; Financial Records:</strong> Retained for a minimum of six (6) years following a transaction to comply with Nigerian corporate tax, auditing, and commercial recordkeeping laws.</li>
        <li><strong>Design Files for Guest/One-Off Orders:</strong> Retained for 90 days post-delivery to allow for reprint requests or quality assurance resolution, after which they are purged unless saved to a registered user account.</li>
        <li><strong>Marketing Consent Records:</strong> Retained until you withdraw consent or unsubscribe.</li>
      </ul>

      <h2>10. Cookies and Local Browser Storage</h2>
      <p>
        bransion.com uses essential cookies and browser storage mechanisms
        (localStorage / sessionStorage) to keep your shopping cart intact,
        preserve your selected apparel sub-styles while browsing, maintain
        authenticated login sessions, and protect against Cross-Site Request
        Forgery (CSRF) attacks.
      </p>
      <p>
        You can control or clear cookies through your browser settings at any
        time; however, disabling strictly necessary cookies may prevent the
        customization tool and checkout flow from functioning properly.
      </p>

      <h2>11. Your Statutory Rights as a Data Subject</h2>
      <p>
        Under the Nigeria Data Protection Act (NDPA) 2023 and international
        privacy frameworks, you hold comprehensive rights over your personal data:
      </p>
      <ul>
        <li><strong>Right of Access:</strong> Request confirmation of whether we process your personal data and obtain a structured copy of that data.</li>
        <li><strong>Right to Rectification:</strong> Request immediate correction of inaccurate or incomplete personal information.</li>
        <li><strong>Right to Erasure (&quot;Right to be Forgotten&quot;):</strong> Request the deletion of your account, personal details, and uploaded design files where there is no overriding legal obligation requiring us to retain them.</li>
        <li><strong>Right to Restrict Processing:</strong> Request that we temporarily suspend processing your data while a dispute regarding accuracy or lawful basis is resolved.</li>
        <li><strong>Right to Data Portability:</strong> Receive your personal data and uploaded customization records in a structured, commonly used, machine-readable format.</li>
        <li><strong>Right to Object:</strong> Object at any time to the processing of your data for direct marketing purposes.</li>
        <li><strong>Right to Withdraw Consent:</strong> Where processing relies on your consent, you may withdraw that consent at any time without affecting the lawfulness of prior processing.</li>
        <li><strong>Right to Lodge a Complaint:</strong> If you believe your privacy rights have been infringed, you have the right to file a formal complaint with the Nigeria Data Protection Commission (NDPC).</li>
      </ul>
      <p>
        To exercise any of these rights, email us at privacy@bransion.com with the
        subject line &quot;Data Subject Request.&quot; We will verify your
        identity and respond within 30 days at no charge.
      </p>

      <h2>12. Children&apos;s Privacy</h2>
      <p>
        Bransion&apos;s services, custom apparel ordering tools, and commercial
        accounts are intended for individuals aged 18 years and older (or minors
        acting under the direct supervision and verifiable consent of a parent or
        legal guardian). We do not knowingly collect personal data from children
        under the age of 13. If we become aware that a child has provided personal
        data without parental authorization, we will promptly erase the
        information.
      </p>

      <h2>13. Updates to This Privacy Policy</h2>
      <p>
        As Bransion evolves—introducing new apparel lines, automated AI-assisted
        design workflows, and expanded logistics—we may periodically update this
        Privacy Policy. Any material changes will be reflected by updating the
        &quot;Last Updated&quot; date at the top of this page, and registered
        users will receive direct notification via email or dashboard alert prior
        to the changes taking effect.
      </p>

      <h2>14. Contact Us</h2>
      <p>
        If you have any questions, psychological or legal concerns regarding data
        trust, or requests concerning this Privacy Policy, please reach out
        directly:
      </p>
      <ul>
        <li><strong>Data Protection &amp; Privacy Desk:</strong> privacy@bransion.com</li>
        <li><strong>General Customer Support:</strong> support@bransion.com</li>
        <li><strong>Official Website:</strong> https://bransion.com</li>
      </ul>
    </>
  );
}