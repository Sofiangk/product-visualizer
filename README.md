# Saidalia Product Manager

A modern, responsive product catalog management system built with Next.js 16, featuring bilingual support (English/Arabic) and intuitive data visualization.

## Features

- 📱 **Mobile-First Design** - Fully responsive with optimized mobile experience
- 🔍 **Advanced Filtering** - Search, filter by category, and image availability
- 📊 **Multiple Views** - Switch between table and grid layouts
- 🖼️ **Image Carousel** - Automatic image carousel in product cards when multiple images are available
- 🍞 **Category Breadcrumbs** - Clear category hierarchy display (cat > sub-cat) in product cards
- ✏️ **Inline Editing** - Quick category updates with dropdown selection
- 📝 **Full Product Editor** - Comprehensive product editing dialog with tabbed interface
- 🌐 **Bilingual Support** - English and Arabic descriptions with RTL support
- 📤 **Import/Export** - CSV import/export with advanced filtering and Magento format support
- 🏷️ **Smart Categorization** - 8 main categories with validated subcategories
- 💾 **Data Persistence** - Client-side localStorage persistence for product edits
- 🎨 **Modern UI** - Built with Radix UI and Tailwind CSS
- 🔢 **Smart Defaults** - Price and Quantity default to 1.0 if missing or zero
- 📊 **Consistent Formatting** - All prices display with one decimal place (e.g., 85.0, 150.0)

## Product Categories

- Mom & Baby
- Vitamins & Supplements
- Treatments
- Skin Care
- Hair Care
- Makeup & Lenses
- Personal Care
- Home Health Care

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **UI Components:** Radix UI
- **Tables:** TanStack Table
- **Forms:** React Hook Form + Zod
- **CSV Parsing:** PapaParse

## Getting Started

### Prerequisites

- Node.js 20+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
product-visualizer/
├── app/                    # Next.js app directory
│   ├── actions.ts         # Server actions for data persistence
│   ├── page.tsx           # Main page component
│   └── layout.tsx         # Root layout with metadata
├── components/            # React components
│   ├── ui/               # Reusable UI components (Radix)
│   ├── data-table.tsx    # Main data table with views
│   ├── columns.tsx       # Table column definitions
│   ├── product-card.tsx  # Grid view card component
│   ├── product-dialog.tsx # Product editor dialog
│   └── ...               # Other components
├── lib/                   # Utility libraries
│   ├── schema.ts         # Zod validation schemas
│   ├── categories.ts     # Category mappings
│   ├── csv.ts           # CSV parsing utilities
│   └── magento-mapper.ts # Magento format conversion
└── public/               # Static assets

```

## Mobile Enhancements

The app is fully optimized for mobile devices:

- Responsive padding and font sizes
- Flexible toolbar layout with proper wrapping
- Single-column forms on small screens
- Simplified pagination display
- Touch-friendly buttons and controls
- Proper viewport configuration

## Deployment

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Sofiangk/product-visualizer)

Or using Vercel CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

The app will be automatically configured for optimal Next.js deployment.

## Environment Variables

No environment variables are required for basic operation. The app reads from a static CSV file in the `public` directory.

## Data Management

### Import CSV
1. Click "Import" button
2. Select a CSV file with product data
3. Data will be loaded into the table

### Export CSV
1. Click "Export" button
2. Choose export scope:
   - All Products
   - Selected Rows (use checkboxes in table to select)
3. Choose format:
   - Standard format (custom column selection)
   - Magento format (all required fields)
4. Apply filters (optional):
   - Image filters: All / With images / Missing images
   - Description filters: All / With descriptions / Missing descriptions
   - Category filters: Select specific main/sub categories
   - Row limit: Limit number of exported rows
5. File will be downloaded

### CSV Format

The app expects CSV files with these columns:
- ID
- Website
- Product
- Price
- Barcode
- Expiry Date
- Quantity
- Main Category (EN)
- Sub-Category (EN)
- Image
- Additional Images (pipe-separated URLs: `url1|url2|url3`)
- Short Description En
- Long Description En
- Short Description Ar
- Long Description Ar

### Product Cards

Product cards in grid view feature:
- **Image Carousel**: Automatically cycles through multiple images (main + additional) every 3 seconds
- **Navigation Controls**: Hover to reveal previous/next arrows and image indicators
- **Category Breadcrumbs**: Shows category hierarchy as "Main Category > Sub-Category"
- **Quick Edit**: Click "Edit" button to open full product editor

## Export Filters

The export dialog includes powerful filtering options:

### Image Filters
- **All products** - Export all products regardless of image status
- **Only products with images** - Export products that have at least one image
- **Only products with no images** - Export products missing images (useful for identifying what needs images)

### Description Filters
- **All products** - Export all products regardless of description status
- **Only products with descriptions** - Export products that have at least one description field filled
- **Only products with no descriptions** - Export products missing descriptions (useful for identifying what needs descriptions)

### Category Filters
- Multi-select main categories
- Multi-select sub-categories (filtered by selected main categories)
- "All" checkboxes to disable category filtering

### Row Limit
- Option to limit the number of rows exported
- Useful for testing or exporting specific batches

All filters work together and can be combined. The preview count shows exactly how many rows will be exported.

## Data Defaults

- **Price**: Automatically defaults to `1.0` if missing, empty, zero, or "nan"
- **Quantity**: Automatically defaults to `1.0` if missing, empty, zero, or "nan"
- **Price Formatting**: All prices display with one decimal place for consistency (e.g., `85.0`, `150.0`, `1.0`)

## License

Proprietary - Saidalia

## Support

For support, please contact the development team.
