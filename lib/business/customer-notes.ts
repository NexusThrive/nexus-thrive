/**
 * Constantes del dominio de notas de clientes (Ficha 360°).
 * Vive FUERA de las Server Actions porque un módulo `"use server"` solo
 * puede exportar funciones async (y tipos): la UI client y el servidor
 * la importan desde aquí.
 */
export const NOTE_MAX_LENGTH = 1000;