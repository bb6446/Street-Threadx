# Security Specification

## 1. Data Invariants
- Products: Can only be created, updated, or deleted by an Admin.
- Customers: Can only be created by the system/user upon ordering, but can only be read/updated by an Admin or the customer themselves (if applicable, but right now customers are tracked by email).
- Orders: Can be created by anyone (guest/user) checking out, but can only be read/updated by an Admin or the owner of the order.
- Expenses: Admin only.
- Config: Admin only write, public read.
- Reviews: Public read, only authenticated users can create. Only author or admin can update/delete.
- Chat Sessions: Admin can list/read/write all. Guests can read/write their own session.

## 2. The "Dirty Dozen" Payloads
1. Unauthorized Product Creation (Missing Admin)
2. Shadow Update on Product (Adding extra fields like 'isVerified')
3. Order Creation with invalid subtotal/total calculation
4. Order Read by non-owner
5. Customer Info Leak (Guest reading `/customers`)
6. Invalid Expense Date Format
7. Review Creation with spoofed author email
8. Review Update by non-author
9. System-Only Field Modification (changing `createdAt` during update)
10. Mass Array/String Exhaustion (Denial of Wallet with 1MB strings)
11. Chat Session Spying (User A reading User B's session)
12. Admin Elevation (Spoofing admin role in profile)
