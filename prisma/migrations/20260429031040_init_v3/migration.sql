-- CreateTable
CREATE TABLE "Categoria" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Tipologia" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "categoriaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "modoDeProducao" TEXT NOT NULL,
    "imagemUrl" TEXT,
    "desenhoEsquematicoUrl" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tipologia_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Variable" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipologiaId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "descricao" TEXT,
    "kind" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "unit" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "defaultValue" TEXT,
    "minValue" TEXT,
    "maxValue" TEXT,
    "options" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Variable_tipologiaId_fkey" FOREIGN KEY ("tipologiaId") REFERENCES "Tipologia" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComputedValue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipologiaId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "expression" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "pieceGroupId" INTEGER,
    "orderInScope" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ComputedValue_tipologiaId_fkey" FOREIGN KEY ("tipologiaId") REFERENCES "Tipologia" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ComputedValue_pieceGroupId_fkey" FOREIGN KEY ("pieceGroupId") REFERENCES "PieceGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PieceGroup" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipologiaId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "quantityExpression" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PieceGroup_tipologiaId_fkey" FOREIGN KEY ("tipologiaId") REFERENCES "Tipologia" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PieceRole" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pieceGroupId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "selectorKind" TEXT NOT NULL,
    "selectorValue" TEXT,
    "condition" TEXT,
    "widthExpression" TEXT NOT NULL,
    "heightExpression" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PieceRole_pieceGroupId_fkey" FOREIGN KEY ("pieceGroupId") REFERENCES "PieceGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SpecificationTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipologiaId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "schemaAtributos" TEXT NOT NULL,
    "requiredMin" INTEGER NOT NULL DEFAULT 0,
    "requiredMax" INTEGER,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SpecificationTemplate_tipologiaId_fkey" FOREIGN KEY ("tipologiaId") REFERENCES "Tipologia" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipologiaId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "label" TEXT,
    "componentKind" TEXT NOT NULL,
    "basis" TEXT NOT NULL,
    "appliesTo" TEXT NOT NULL,
    "appliesToValue" TEXT,
    "expression" TEXT NOT NULL,
    "condition" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "PricingRule_tipologiaId_fkey" FOREIGN KEY ("tipologiaId") REFERENCES "Tipologia" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CorVidro" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "CorVidroPreco" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "corId" INTEGER NOT NULL,
    "espessura" INTEGER NOT NULL,
    "precoM2" REAL NOT NULL,
    CONSTRAINT "CorVidroPreco_corId_fkey" FOREIGN KEY ("corId") REFERENCES "CorVidro" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModeloTorre" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "preco" REAL NOT NULL,
    "maxFurosPorTorre" INTEGER NOT NULL DEFAULT 3,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateIndex
CREATE UNIQUE INDEX "Variable_tipologiaId_codigo_key" ON "Variable"("tipologiaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ComputedValue_tipologiaId_codigo_scope_pieceGroupId_key" ON "ComputedValue"("tipologiaId", "codigo", "scope", "pieceGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "PieceGroup_tipologiaId_codigo_key" ON "PieceGroup"("tipologiaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "PieceRole_pieceGroupId_codigo_key" ON "PieceRole"("pieceGroupId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "SpecificationTemplate_tipologiaId_codigo_key" ON "SpecificationTemplate"("tipologiaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "PricingRule_tipologiaId_codigo_key" ON "PricingRule"("tipologiaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "CorVidro_codigo_key" ON "CorVidro"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "CorVidroPreco_corId_espessura_key" ON "CorVidroPreco"("corId", "espessura");

-- CreateIndex
CREATE UNIQUE INDEX "ModeloTorre_codigo_key" ON "ModeloTorre"("codigo");
