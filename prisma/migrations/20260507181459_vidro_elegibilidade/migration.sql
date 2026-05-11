/*
  Warnings:

  - You are about to drop the `CorVidroPreco` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CorVidroPreco";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Vidro" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "corId" INTEGER NOT NULL,
    "espessura" INTEGER NOT NULL,
    "precoM2" REAL NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Vidro_corId_fkey" FOREIGN KEY ("corId") REFERENCES "CorVidro" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TipologiaVidro" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipologiaId" INTEGER NOT NULL,
    "vidroId" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TipologiaVidro_tipologiaId_fkey" FOREIGN KEY ("tipologiaId") REFERENCES "Tipologia" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TipologiaVidro_vidroId_fkey" FOREIGN KEY ("vidroId") REFERENCES "Vidro" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Vidro_codigo_key" ON "Vidro"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Vidro_corId_espessura_key" ON "Vidro"("corId", "espessura");

-- CreateIndex
CREATE UNIQUE INDEX "TipologiaVidro_tipologiaId_vidroId_key" ON "TipologiaVidro"("tipologiaId", "vidroId");
