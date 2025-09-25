import type { Database as DB } from "@/utils/types/database.types";

declare global {
    type Database = DB;
}