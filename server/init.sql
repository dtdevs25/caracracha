-- Database initialization script for CaraCracha

-- Create Enum Role
CREATE TYPE "Role" AS ENUM ('MASTER', 'ADMIN', 'USER');

-- Users Table
CREATE TABLE "users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "username" TEXT UNIQUE NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Badge Templates Table
CREATE TABLE "badge_templates" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "owner_id" UUID NOT NULL REFERENCES "users"("id"),
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "orientation" TEXT NOT NULL,
    "bleed" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "front" JSONB NOT NULL,
    "back" JSONB NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Batch Records Table
CREATE TABLE "batch_records" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL REFERENCES "badge_templates"("id") ON DELETE CASCADE,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initial Master User
-- Password is 'nova@2026' hashed
INSERT INTO "users" ("username", "password", "role", "name")
VALUES ('dsantos@ctdi.com', '$2b$10$Z.R2G8RieJ/dDvx9JNLoyO0vHBxzRuwZp8S337StfyLvtstKBJHEO', 'MASTER', 'Usuário Master')
ON CONFLICT ("username") DO NOTHING;
