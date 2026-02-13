// src/components/UserProfile/UserMetaCard.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";

import { db } from "../../firebase";
import { useModal } from "../../hooks/useModal";
import ModalShell from "../common/ModalShell";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";

import { getSignedUrl, uploadFile } from "../../services/files";
import { useDialogCenter } from "../common/DialogCenter";

type Profile = {
  email: string;
  employeeNo: string;
  role: string;
  fname: string;
  lname: string;
  position: string;
  departmentId: string;
  phone: string;
  active: boolean;
  avatarUrl?: string | null;
};

function isPermissionError(err: any) {
  return (
    err?.code === "permission-denied" ||
    String(err?.message || "").includes("Missing or insufficient permissions")
  );
}

export default function UserMetaCard({ profile }: { profile: Profile }) {
  const { isOpen, openModal, closeModal } = useModal();
  const dialog = useDialogCenter();

  const fileRef = useRef<HTMLInputElement | null>(null);

  const [phone, setPhone] = useState(profile.phone);
  const [saving, setSaving] = useState(false);

  const [avatarPath, setAvatarPath] = useState<string | null>(profile.avatarUrl || null);
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setPhone(profile.phone);
    setAvatarPath(profile.avatarUrl || null);
  }, [profile.phone, profile.avatarUrl]);

  useEffect(() => {
    if (!pickedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pickedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pickedFile]);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!avatarPath) {
        setAvatarSignedUrl(null);
        return;
      }

      setAvatarLoading(true);
      try {
        const url = await getSignedUrl(avatarPath);
        if (!alive) return;
        setAvatarSignedUrl(url);
      } catch {
        if (!alive) return;
        setAvatarSignedUrl(null);
      } finally {
        if (alive) setAvatarLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [avatarPath]);

  const initials = useMemo(() => {
    const a = `${profile?.fname?.[0] || "U"}${profile?.lname?.[0] || ""}`;
    return a.toUpperCase();
  }, [profile.fname, profile.lname]);

  const showAvatarUrl = previewUrl || avatarSignedUrl;

  const handleOpen = () => {
    setPhone(profile.phone);
    setAvatarPath(profile.avatarUrl || null);
    setPickedFile(null);
    setPreviewUrl(null);
    openModal();
  };

  const handleRemoveAvatar = () => {
    setPickedFile(null);
    setPreviewUrl(null);
    setAvatarPath(null);
    setAvatarSignedUrl(null);
  };

  const handlePickFile = () => fileRef.current?.click();

  const handleFileChange = (f: File | null) => {
    if (!f) {
      setPickedFile(null);
      return;
    }
    if (!String(f.type || "").startsWith("image/")) {
      dialog.alert("รองรับเฉพาะไฟล์รูปภาพ (image/*) เท่านั้น", { title: "Error", variant: "danger" });
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      dialog.alert("ไฟล์ใหญ่เกิน 15MB", { title: "Error", variant: "danger" });
      return;
    }
    setPickedFile(f);
  };

  const handleSave = async () => {
    if (!profile.employeeNo || profile.employeeNo === "-") {
      dialog.alert("ไม่พบ employeeNo ในระบบ", { title: "Error", variant: "danger" });
      return;
    }

    setSaving(true);
    try {
      let nextAvatarPath: string | null = avatarPath;

      if (pickedFile) {
        const up = await uploadFile(pickedFile, "profile");
        nextAvatarPath = up.storagePath;
      }

      await updateDoc(doc(db, "employees", profile.employeeNo), {
        phone: String(phone || "").trim(),
        avatarUrl: nextAvatarPath || null,
        updatedAt: serverTimestamp(),
      });

      window.dispatchEvent(new Event("profile-updated"));
      closeModal();

      dialog.alert("บันทึกโปรไฟล์แล้ว", { title: "Success", variant: "success" });
    } catch (err: any) {
      console.error(err);
      dialog.alert(
        isPermissionError(err)
          ? "สิทธิ์ไม่พอในการแก้ไขโปรไฟล์ (ตรวจสอบ Firestore Rules)"
          : "บันทึกไม่สำเร็จ",
        { title: "Error", variant: "danger" }
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* การ์ดด้านบน */}
      <div className="p-5 border border-gray-200 rounded-2xl bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100 text-xl font-semibold text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200">
                {showAvatarUrl ? (
                  <img
                    src={showAvatarUrl}
                    alt="avatar"
                    className="h-full w-full object-cover"
                    onError={() => setAvatarSignedUrl(null)}
                  />
                ) : (
                  initials
                )}
              </div>
              {avatarLoading && <div className="text-xs text-gray-500 dark:text-gray-400">กำลังโหลดรูป...</div>}
            </div>

            <div className="order-2 xl:order-2">
              <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                {profile.fname} {profile.lname}
              </h4>
              <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                <p className="text-sm text-gray-500 dark:text-gray-400">{profile.position}</p>
                <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {profile.departmentId} • {profile.role}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleOpen}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
          >
            Edit
          </button>
        </div>
      </div>

      {/* ✅ Modal: ให้ “พื้นขาว” และให้ glow ทำโดย ModalShell เท่านั้น */}
      <ModalShell
        open={isOpen}
        onClose={closeModal}
        widthClassName="max-w-[720px]"
        title="Edit Profile"
        description='แก้ไขได้เฉพาะ “รูปโปรไฟล์” และ “เบอร์โทร” เท่านั้น'
        showTopBar={true}
        closeOnEsc={!saving}
        closeOnBackdrop={!saving}
        canClose={() => !saving}
        glow={true}
        // ✅ ห้ามใส่ after/before glow แล้ว
        panelClassName="bg-white"
      >
        <div className="bg-white">
          {/* Avatar box */}
          <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <Label>Profile Picture</Label>

            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 overflow-hidden rounded-full border border-gray-200 bg-white">
                  {showAvatarUrl ? (
                    <img src={showAvatarUrl} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gray-100 text-base font-semibold text-gray-700">
                      {initials}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800">
                    {pickedFile ? `เลือกไฟล์: ${pickedFile.name}` : "ยังไม่ได้เลือกไฟล์"}
                  </div>
                  <div className="text-xs text-gray-500">
                    รองรับเฉพาะไฟล์รูปภาพ (image/*) ขนาดไม่เกิน 15MB
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handlePickFile}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg"
                >
                  <span className="text-base leading-none">＋</span>
                  Addfile
                </button>

                <Button size="sm" variant="outline" type="button" onClick={handleRemoveAvatar}>
                  Remove
                </Button>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                />
              </div>
            </div>
          </div>

          {/* Phone */}
          <div className="mb-6">
            <Label>Phone</Label>
            <Input type="text" value={phone} onChange={(e: any) => setPhone(e.target.value)} />
          </div>

          {/* Read-only */}
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
            <div>
              <Label>First Name (Read-only)</Label>
              <Input type="text" value={profile.fname} readOnly />
            </div>
            <div>
              <Label>Last Name (Read-only)</Label>
              <Input type="text" value={profile.lname} readOnly />
            </div>
            <div className="lg:col-span-2">
              <Label>Email (Read-only)</Label>
              <Input type="text" value={profile.email} readOnly />
            </div>
            <div className="lg:col-span-2">
              <Label>Position (Read-only)</Label>
              <Input type="text" value={profile.position} readOnly />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 flex items-center justify-end gap-3">
            <Button size="sm" variant="outline" onClick={closeModal} type="button" disabled={saving}>
              Close
            </Button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </ModalShell>
    </>
  );
}
