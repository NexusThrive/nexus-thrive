/** Acciones del equipo en Storybook: validan como el servidor y no guardan nada. */
const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
type R = { ok: true; message: string } | { ok: false; message: string };
export async function updateMyProfileAction(_slug: string, input: { name: string }): Promise<R> {
  await wait();
  return input.name.trim().length < 2 ? { ok: false, message: "Escribe tu nombre." } : { ok: true, message: "Tu perfil se actualizó" };
}
export async function inviteMemberAction(): Promise<R> { await wait(); return { ok: true, message: "Invitación enviada" }; }
export async function revokeInviteAction(): Promise<R> { await wait(); return { ok: true, message: "Invitación cancelada" }; }
export async function changeMemberRoleAction(): Promise<R> { await wait(); return { ok: true, message: "Rol actualizado" }; }
export async function setMemberActiveAction(): Promise<R> { await wait(); return { ok: true, message: "Listo" }; }
