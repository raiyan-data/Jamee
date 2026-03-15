import React from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { SettingsSection } from "./SettingsSection";
import { SettingsRow } from "./SettingsRow";

export function NotificationsSection() {
  const { settings, updateSetting, isSavingKey } = useSettings();

  return (
    <SettingsSection title="Notifications" testID="settings-notifications">
      <SettingsRow
        icon="heart"
        label="Likes"
        isToggle
        toggleValue={settings.notify_likes}
        onToggle={(val) => updateSetting("notify_likes", val)}
        isSaving={isSavingKey("notify_likes")}
        testID="settings-notify-likes"
      />
      <SettingsRow
        icon="message-square"
        label="Comments"
        isToggle
        toggleValue={settings.notify_comments}
        onToggle={(val) => updateSetting("notify_comments", val)}
        isSaving={isSavingKey("notify_comments")}
        testID="settings-notify-comments"
      />
      <SettingsRow
        icon="user-plus"
        label="Follows"
        isToggle
        toggleValue={settings.notify_follows}
        onToggle={(val) => updateSetting("notify_follows", val)}
        isSaving={isSavingKey("notify_follows")}
        testID="settings-notify-follows"
      />
      <SettingsRow
        icon="home"
        label="Masjid Announcements"
        isToggle
        toggleValue={settings.notify_masjid}
        onToggle={(val) => updateSetting("notify_masjid", val)}
        isSaving={isSavingKey("notify_masjid")}
        testID="settings-notify-masjid"
      />
      <SettingsRow
        icon="bell"
        label="Reminders"
        isToggle
        toggleValue={settings.notify_reminders}
        onToggle={(val) => updateSetting("notify_reminders", val)}
        isSaving={isSavingKey("notify_reminders")}
        testID="settings-notify-reminders"
      />
    </SettingsSection>
  );
}
