import { useEffect, useState } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";

import { db } from "../../firebase";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { useToastCenter } from "../common/ToastCenter";

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
};

export default function UserMetaCard({ profile }: { profile: any }) {
  const { isOpen, openModal, closeModal } = useModal();
  const { showToast } = useToastCenter();

  const [fname, setFname] = useState(profile.fname);
  const [lname, setLname] = useState(profile.lname);
  const [phone, setPhone] = useState(profile.phone);
  const [position, setPosition] = useState(profile.position);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFname(profile.fname);
    setLname(profile.lname);
    setPhone(profile.phone);
    setPosition(profile.position);
  }, [profile.fname, profile.lname, profile.phone, profile.position]);

  const handleOpen = () => {
    setFname(profile.fname);
    setLname(profile.lname);
    setPhone(profile.phone);
    setPosition(profile.position);
    openModal();
  };

  const handleSave = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (!profile.employeeNo || profile.employeeNo === "-") {
      showToast("ไม่พบ employeeNo ในระบบ", { title: "Error", variant: "danger" });
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, "employees", profile.employeeNo), {
        fname: String(fname || "").trim(),
        lname: String(lname || "").trim(),
        phone: String(phone || "").trim(),
        position: String(position || "").trim(),
        updatedAt: serverTimestamp(),
      });

      showToast("บันทึกโปรไฟล์แล้ว", { title: "Success", variant: "success" });
      window.dispatchEvent(new Event("profile-updated"));
      closeModal();
    } catch (err) {
      console.error(err);
      showToast("บันทึกไม่สำเร็จ", { title: "Error", variant: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const initials = `${profile?.fname?.[0] || "U"}${profile?.lname?.[0] || ""}`.toUpperCase();

  return (
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
            {/* ✅ Avatar เป็นตัวอักษร (ไม่ใช้รูปแล้ว) */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-xl font-semibold text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200">
                {initials}
              </div>
            </div>

            {/* ✅ ชื่อ/ตำแหน่งจริง */}
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

          {/* ✅ เหลือแค่ปุ่ม Edit เดียว */}
          <button
            onClick={handleOpen}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
          >
            <svg
              className="fill-current"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                fill=""
              />
            </svg>
            Edit
          </button>
        </div>
      </div>

      {/* ✅ modal แก้ข้อมูล */}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Personal Information
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Update your details to keep your profile up-to-date.
            </p>
          </div>

          <form className="flex flex-col">
            <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
              <div className="mt-2">
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Personal Information
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div className="col-span-2 lg:col-span-1">
                    <Label>First Name</Label>
                    <Input type="text" value={fname} onChange={(e: any) => setFname(e.target.value)} />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Last Name</Label>
                    <Input type="text" value={lname} onChange={(e: any) => setLname(e.target.value)} />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Email Address</Label>
                    <Input type="text" value={profile.email} readOnly />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Phone</Label>
                    <Input type="text" value={phone} onChange={(e: any) => setPhone(e.target.value)} />
                  </div>

                  <div className="col-span-2">
                    <Label>Position</Label>
                    <Input type="text" value={position} onChange={(e: any) => setPosition(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal} type="button">
                Close
              </Button>
              <Button size="sm" onClick={handleSave} type="button" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
