import { notFound, redirect } from "next/navigation";
import { getValidStaffInvite } from "@/lib/platform/team/team";
import { applicationInvitationDestination } from "@/lib/platform/admin/owner-invitation-delivery";
import { ManagedAccessNotice } from "@/components/molecules/managed-access-notice";

/** A valid staff token can start restricted identity registration without free signup. */
export default async function InvitedStaffRegistration({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getValidStaffInvite(token);
  if (!invite) notFound();
  let destination: string;
  try { destination = (await applicationInvitationDestination(invite.email)).url; }
  catch { return <ManagedAccessNotice reason="unauthorized" />; }
  redirect(destination);
}
