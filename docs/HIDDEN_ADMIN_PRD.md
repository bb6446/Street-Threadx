# PRD: Hidden Admin Inventory & Order Tracking System

## 1. Executive Summary
The "Hidden Admin" system is an internal-only suite designed to provide high-fidelity control over the STREET THREADX supply chain. It focuses on discreet inventory management, blind-box allocation, and deep-order tracking that is inaccessible to standard clerical roles.

## 2. User Stories
- **As an Inventory Lead**, I want to track "Reserved Stock" for VIP drops so that I don't oversell before a public launch.
- **As a Full-Stack Admin**, I want real-time POS sync so that physical pop-up sales immediately reflect on the web storefront.
- **As a Security Admin**, I want an audit trail of every stock adjustment to prevent internal shrinkage.

## 3. Technical Requirements
- **RT-INV-1**: Real-time inventory synchronization via Firestore snapshots.
- **RT-INV-2**: Atomic transactions for stock deduction.
- **UI-ADMIN-1**: Contextual "Focus Mode" for high-load admin tasks.
- **API-INT-1**: Webhook support for third-party POS integrations.

## 4. Acceptance Criteria
- [ ] Stock levels cannot drop below zero during concurrent transactions.
- [ ] Hidden stock "Buffer" values are only visible to `SUPER_ADMIN` roles.
- [ ] Every POS transaction generates a unique receipt hash in the `pos_transactions` collection.
- [ ] The Global Sentiment Heatmap reflects POS regional data.

## 5. Mind Map Structure (Visual Reference)
- **ROOT: Hidden Admin Suite**
    - **Inventory Control**
        - Buffer/Safety Stock
        - Real-time POS Deduct
        - Virtual Skus
    - **Order Matrix**
        - Internal Notes
        - VIP Priority Flagging
        - Conflict Resolution
    - **Analytics Hub**
        - Sentiment Topography
        - Scenario Modeling (What-if)
