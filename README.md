# ERD Visualizer & Query Builder

A powerful, interactive Entity-Relationship Diagram (ERD) Visualizer and Query Builder built with React, TypeScript, and Vite. This tool allows developers, database administrators, and data analysts to easily parse SQL schema dumps, visualize complex database structures, and visually construct SQL queries.

## Key Features

*   **Multi-Dialect SQL Parsing:** Upload your `.sql` DDL files. The robust parser understands **PostgreSQL, MySQL, and SQLite** syntax to automatically extract tables, columns, data types, and foreign key relationships.
*   **Interactive Visualizer:** Powered by React Flow, the canvas provides a fluid, interactive map of your database schema. Zoom, pan, and explore nodes seamlessly.
*   **High Performance:** Designed to handle massive database schemas gracefully. Tested and optimized for schemas with 1000+ tables.
*   **Auto-Layouting:** Automatically arranges even the most complex schemas using Dagre for clean, readable layouts without manual dragging.
*   **Intelligent Pathfinding:** Need to join two distant tables? The built-in pathfinder calculates the shortest JOIN path between any two tables in your schema.
*   **Visual Query Builder:** Construct complex queries visually. Select tables, pick columns, apply filters and sorts, and let the tool generate the underlying logic for you, including automatic joins based on foreign keys.
*   **Schema Analytics:** Get instant insights into your database structure, including estimated row sizes (in bytes) based on column data types.
*   **Drag-and-Drop Interface:** Simply drag your `.sql` dump file onto the dropzone to instantly render the ERD.
*   **Session Persistence:** Your parsed schema is saved in local session storage, so you don't lose your progress if you accidentally refresh the page.
*   **Search & Details:** Quickly search for specific tables or columns using the search panel, and view detailed information for any selected table in the details panel.

## Getting Started

### Prerequisites

*   Node.js (v18 or higher recommended)
*   npm or pnpm or yarn

### Installation

1.  Clone the repository and navigate to the project directory:
    ```bash
    cd ERD
    ```

2.  Install the dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

4.  Open your browser and navigate to `http://localhost:5173` (or the port specified by Vite).

## Built With

*   **[React](https://reactjs.org/)** - UI library
*   **[TypeScript](https://www.typescriptlang.org/)** - Static typing
*   **[Vite](https://vitejs.dev/)** - Frontend tooling and bundler
*   **[React Flow](https://reactflow.dev/)** - Node-based UI for rendering the ERD
*   **[Dagre](https://github.com/dagrejs/dagre)** - Directed graph layout algorithm
*   **[Node SQL Parser](https://github.com/taozhi8833998/node-sql-parser)** - Abstract Syntax Tree generation for SQL
*   **[pg-query-emscripten](https://github.com/pganalyze/pg_query_emscripten)** - Postgres query parser

## Project Structure

*   `src/components/`: Reusable React components (Canvas, UI panels, etc.)
*   `src/parser/`: SQL parsing logic for different dialects (MySQL, Postgres, SQLite)
*   `src/utils/`: Core utilities for pathfinding, query building, table analytics, and graph layouts
*   `src/types/`: TypeScript type definitions

## Usage Guide

1.  **Upload Schema:** Drag and drop your `.sql` file containing your database's `CREATE TABLE` statements onto the canvas.
2.  **Explore:** Use your mouse/trackpad to zoom and pan around the diagram. Click on any table node to see its detailed columns and constraints in the right panel.
3.  **Find Paths:** Open the Pathfinder tool, select a start table and a target table, and click "Find Path" to see the shortest sequence of JOINs required to connect them.
4.  **Build Queries:** Switch to the Query Builder view, select the columns you want to query, add any necessary filters, and view the visual representation of your query context.

## License

This project is licensed under the terms provided in the `LICENSE` file.
