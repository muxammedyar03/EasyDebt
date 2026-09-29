import { PushNotificationSettings } from "@/components/push-notification-settings";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/security/permission-access";

export default async function PushNotificationsPage() {
  if (!(await hasPermission(await getSession(), "push-settings.view"))) redirect("/unauthorized");
  return (
    <div className="container py-6">
      <PushNotificationSettings />
    </div>
  );
}
