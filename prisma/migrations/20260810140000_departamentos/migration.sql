-- CreateTable
CREATE TABLE "Departamento" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Departamento_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Departamento" ADD CONSTRAINT "Departamento_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable (relación muchos-a-muchos: profesores de cada departamento)
CREATE TABLE "_DepartamentoProfesores" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_DepartamentoProfesores_AB_unique" ON "_DepartamentoProfesores"("A", "B");
CREATE INDEX "_DepartamentoProfesores_B_index" ON "_DepartamentoProfesores"("B");

-- AddForeignKey
ALTER TABLE "_DepartamentoProfesores" ADD CONSTRAINT "_DepartamentoProfesores_A_fkey" FOREIGN KEY ("A") REFERENCES "Departamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_DepartamentoProfesores" ADD CONSTRAINT "_DepartamentoProfesores_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable (relación muchos-a-muchos: coordinadores de cada departamento)
CREATE TABLE "_DepartamentoCoordinadores" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_DepartamentoCoordinadores_AB_unique" ON "_DepartamentoCoordinadores"("A", "B");
CREATE INDEX "_DepartamentoCoordinadores_B_index" ON "_DepartamentoCoordinadores"("B");

-- AddForeignKey
ALTER TABLE "_DepartamentoCoordinadores" ADD CONSTRAINT "_DepartamentoCoordinadores_A_fkey" FOREIGN KEY ("A") REFERENCES "Departamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_DepartamentoCoordinadores" ADD CONSTRAINT "_DepartamentoCoordinadores_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
