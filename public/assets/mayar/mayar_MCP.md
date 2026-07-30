# Mayar MCP Documentation

**URL Source:** [Link](https://mcp.mayar.id/?_gl=1*vav6eu*_gcl_aw*R0NMLjE3ODQ2NjA4MDQuQ2owS0NRandzTUxTQmhEOUFSSXNBSXBVVERwZEV6WjNvZVU2bDZyMkFwZTBWUXEtMkFReGpLS1UzNDM5UzVfbUhGTXRud1ZnYUw0SC1LNGFBakFaRUFMd193Y0I.*_gcl_au*NjQwOTk3NjI0LjE3ODM3MjY2MzUuMjAwMDM1NTA4Mi4xNzg1MDA0NjIwLjE3ODUwMDQ4NDcuOTc2NTE2MzY2LjE3ODQ5OTAxOTEuMTc4NTAwNDg0Nw..)

## What is MCP?


The Model Context Protocol (MCP) is an open standard that enables AI models to securely connect to external data sources and tools. It provides a unified way for AI applications to interact with various services, databases, and APIs while maintaining security and proper access controls.

MCP servers act as bridges between AI models and external systems, allowing models to:

*   Access real-time data from external services
*   Execute functions and operations on behalf of users
*   Maintain secure authentication and authorization
*   Provide structured responses that models can understand

The **Mayar MCP Server** specifically provides AI models with comprehensive access to payment processing, customer management, and transaction data through a secure, standardized interface.





### 🖥️ MCP Client Integration


To connect Mayar MCP Server to an MCP client application such as Claude Desktop, Cursor, or others, add the following configuration in `Settings > Developer > Edit Config` in your app. Replace `your-api-key` as needed.


```json
{
  "mcpServers": {
    "mayar": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.mayar.id/sse",
        "--header",
        "Authorization:${API_KEY}"
      ],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
```

  }
}

### Connection Details


*   **Connection Type:**SSE
*   **Server URL:**https://mcp.mayar.id/sse

**Headers**


*   Authorization: _[Mayar\_API\_Key]_

### Environment Variables


*   API_KEY

Your Mayar API key for authentication

### 🔑 Getting Your API Key


You can obtain your Mayar API Key in Mayar Dashboard > Integration > Api Keys.

---

## Available Tools

### `get_balance`
Retrieve your current Mayar account balance. Useful for monitoring cash flow and available balance.

### `get_payment_channels`
Retrieve configured payment channels for your merchant account (QRIS, VA, e-wallet, etc.).

### `create_invoice`
Create a new invoice for a customer. Supports multiple payment methods and invoice detail customization.

### `get_all_invoices`
Get a list of all invoices with status and search filtering.

### `get_invoice_detail`
Retrieve detailed invoice information by UUID.

### `update_invoice`
Update an existing invoice (items, description, expiration, etc.).

### `send_portal_link`
Send a customer portal link for dashboard access and transaction history.

### `get_customer_detail`
Retrieve detailed customer information by email, including contact data and membership status.

### `get_all_customers`
Get a list of all customers with filtering and pagination support.

### `create_customer`
Create a new customer record with name, email, and mobile.

### `update_customer`
Merge or archive a customer by updating their email.

### `get_latest_transactions`
Get the latest paid transactions. Ideal for real-time activity monitoring.

### `get_latest_transactions_by_customer`
Get the latest transactions for a specific customer and product. Useful for customer service and support.

### `get_transactions_by_time_period`
Filter transactions by time period (day, week, month, year). Suitable for periodic reporting.

### `get_transactions_by_time_range`
Filter transactions within a specific date range. More flexible for custom analysis.

### `get_transactions_by_customer_and_time_range`
Combine customer and date range filters for in-depth per-customer analysis.

### `get_transactions_by_customer_and_time_period`
Filter customer transactions within a certain period. Ideal for customer retention analysis.

### `get_transactions_by_specific_product`
Analyze transactions per product for tracking performance and item popularity.

### `get_daily_transaction_stats`
Get daily transaction statistics (TPV count and transaction count) for quick overview.

### `get_membership_customer_by_specific_product`
Get a list of members by specific membership product. Useful for targeted marketing.

### `get_membership_customer_by_specific_product_and_tier`
Filter members by product and membership tier. Ideal for premium customer segmentation.

### `get_membership_tier_list`
Get a list of membership tiers for a specific product.

### `get_membership_member_detail`
Get detailed information about a specific membership member.

### `create_membership_member`
Register a new customer as a membership member.

### `update_membership_member`
Update membership member details or status.

### `create_membership_invoice`
Create a new invoice for an existing membership member.

### `cancel_membership_member`
Cancel a membership member subscription.

### `get_latest_unpaid_transactions`
Monitor unpaid invoices. Important for cash flow management and follow-up.

### `get_unpaid_transactions_by_time_range`
Filter unpaid transactions within a specific time range for debt collection strategy.

### `get_products`
Get list of products from Mayar with filtering by type, status, and search keywords.

### `get_product_detail`
Get detailed product information by product ID / UUID.

### `create_product`
Create a new product (generic — type specific endpoints also available).

### `get_products_by_type`
Get products filtered by a specific type (ebook, course, etc.).

### `update_product`
Update an existing product by UUID.

### `act_on_product`
Perform actions on a product: activate, close, delete, or duplicate.

### `get_product_transactions`
Get all transactions associated with a specific product.

### `verify_license_code`
Verify a license code for a digital product. Useful for SaaS/software licensing validation.

### `get_all_payments`
Get a list of all request payments / payment links with filtering.

### `get_payment_detail`
Retrieve detailed payment information by UUID.

### `create_payment`
Create a new request payment for a customer.

### `update_payment`
Update an existing request payment.

### `act_on_payment`
Perform actions on a payment: close, activate, or deactivate.

### `sort_payment_links`
Reorder / sort payment links by type with a custom product ID order.

### `create_coupon`
Create a new coupon / discount code for products.

### `validate_coupon`
Validate a coupon during checkout (applies discount calculation).

### `check_coupon`
Check coupon availability and remaining usage.

### `get_coupon_detail`
Retrieve detailed coupon/discount information by UUID.

### `get_all_installments`
Get a list of all installment plans with filtering.

### `get_installment_detail`
Retrieve detailed installment plan with invoices breakdown.

### `create_installment`
Create a new installment plan with tenure, interest, and invoices.

### `get_bundling_list`
Get a list of product bundles.

### `get_bundling_detail`
Retrieve detailed bundle information by UUID.

### `get_webhook_history`
Get webhook delivery history with status filtering.

### `update_webhook_url`
Update merchant webhook URL.

### `test_webhook`
Send a test webhook event to the configured URL.

### `get_product_reviews`
Get reviews for a specific product / payment link.

### `get_product_review_stats`
Get review statistics (ratings distribution) for a product.

### `get_customer_review`
Get the review left by a customer for a specific product.

### `get_merchant_review_stats`
Get overall review statistics for the merchant store.

### `get_all_reviews`
Get all reviews across all products with status filtering.

### `create_review`
Create a new review for a transaction.

### `update_review`
Update an existing review (rating, message, or status).

### `bulk_update_review_status`
Bulk update review status for multiple reviews at once.

### `create_qr_code`
Create a dynamic QRIS code for a specific amount.

### `get_qr_code`
Retrieve the static QRIS code for the merchant.

### `get_webhook_history`
Get webhook delivery history with status filtering.

### `get_new_webhook_history`
Get new webhook history from Scylla database with cursor pagination.

### `update_webhook_url`
Update merchant webhook URL.

### `test_webhook`
Send a test webhook event to the configured URL.

### `retry_webhook`
Retry a failed webhook delivery by history ID.

