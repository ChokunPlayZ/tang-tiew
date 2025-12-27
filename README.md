# TangMa (ตังมา) 🚗💨

TangMa is a modern, mobile-first web application designed to simplify trip planning and expense sharing for groups. Built with the latest web technologies, it offers a seamless experience for managing shared costs, splitting bills, and settling debts among friends.

## ✨ Features

- **📱 Mobile-First Design**: Optimized for mobile usage with a responsive UI, glassmorphism aesthetics, and smooth animations.
- **🔐 Secure Authentication**: Simple and secure login/register flow.
- **📋 Trip & Subgroup Management**:
  - Create multiple trips.
  - Organize members into subgroups (e.g., "Car A", "Drinkers") for easier expense splitting.
  - Join trips easily via a 6-character code.
- **💸 Expense Tracking**:
  - Add expenses with flexible split options (Split by "All" or specific "Groups").
  - Upload receipt slips directly to expenses.
  - View detailed expense lists with payer info.
- **⚖️ Smart Balances**: Automatically calculates who owes whom, simplifying complex group debts.
- **💳 Payment & Settlement**:
  - Generate PromptPay QR codes for instant payments.
  - Upload payment slips for proof of transfer.
  - Track payment history.
- **🎨 Modern UI/UX**:
  - Dark mode support.
  - Beautiful gradients and visual feedback.
  - Interactive dialogs for critical actions.

## 🛠 Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start/latest) (React / Vite)
- **Routing**: [TanStack Router](https://tanstack.com/router/latest)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Database**: PostgreSQL (via [Drizzle ORM](https://orm.drizzle.team/))
- **Headless UI**: [Radix UI](https://www.radix-ui.com/)
- **Runtime**: [Bun](https://bun.sh/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed on your machine.
- A PostgreSQL database (or compatible).

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/tang-tiew.git
    cd tang-tiew
    ```

2.  **Install dependencies**
    ```bash
    bun install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory (copy from `.env.example` if available) and add your database connection string:
    ```env
    DATABASE_URL="postgresql://user:password@localhost:5432/tangtiew"
    SESSION_SECRET="your-super-secret-key"
    ```

4.  **Database Migration**
    Push the schema to your database:
    ```bash
    bun run db:push
    ```

5.  **Run Development Server**
    ```bash
    bun dev
    ```
    The app will be available at `http://localhost:3000`.

## 📜 Scripts

- `bun dev`: Start the development server.
- `bun run build`: Build the application for production.
- `bun run db:generate`: Generate SQL migrations based on schema changes.
- `bun run db:push`: Push schema changes directly to the database (prototyping).
- `bun run db:studio`: Open Drizzle Studio to manage database content.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
