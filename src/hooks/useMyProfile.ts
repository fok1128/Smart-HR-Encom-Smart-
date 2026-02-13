import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

type UserDoc = {
  email?: string;
  employeeNo?: string;
  role?: string;
  active?: string | boolean;
  departmentId?: string;

  // เผื่อบางที่เก็บไว้ใน users
  fname?: string;
  lname?: string;
  position?: string;
  phone?: string;
  avatarUrl?: string;
};

type EmployeeDoc = {
  fname?: string;
  lname?: string;
  position?: string;
  departmentId?: string;
  phone?: string;
  active?: string | boolean;
  avatarUrl?: string;
};

function toBool(v: any) {
  if (typeof v === "boolean") return v;
  return String(v ?? "").toLowerCase() === "true";
}

function isPermissionError(err: any) {
  return (
    err?.code === "permission-denied" ||
    String(err?.message || "").includes("Missing or insufficient permissions")
  );
}

export function useMyProfile() {
  const { user, loading } = useAuth();

  const [profile, setProfile] = useState<{
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
  } | null>(null);

  const [fetching, setFetching] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ✅ trigger เพื่อ refetch หลังอัปเดต
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const onUpdated = () => setReloadKey((x) => x + 1);
    window.addEventListener("profile-updated", onUpdated);
    return () => window.removeEventListener("profile-updated", onUpdated);
  }, []);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (loading) return;

      if (!user?.uid) {
        if (!alive) return;
        setFetching(false);
        setProfile(null);
        setErrorMsg(null);
        return;
      }

      setFetching(true);
      setErrorMsg(null);

      try {
        // 1) users/{uid}
        const uSnap = await getDoc(doc(db, "users", user.uid));
        const u = (uSnap.exists() ? (uSnap.data() as UserDoc) : {}) as UserDoc;

        const employeeNo = u.employeeNo || "";
        const email = u.email || user.email || "";
        const role = String(u.role || "USER").toUpperCase();

        // 2) employees/{employeeNo}
        let emp: EmployeeDoc = {};
        let empDenied = false;

        if (employeeNo) {
          try {
            const eSnap = await getDoc(doc(db, "employees", employeeNo));
            emp = eSnap.exists() ? (eSnap.data() as EmployeeDoc) : {};
          } catch (e: any) {
            if (isPermissionError(e)) empDenied = true;
            else throw e;
          }
        }

        const merged = {
          email,
          employeeNo: employeeNo || "-",
          role,

          // ✅ employees ก่อน แล้วค่อย fallback users
          fname: emp.fname || u.fname || "-",
          lname: emp.lname || u.lname || "",
          position: emp.position || u.position || "-",
          departmentId: emp.departmentId || u.departmentId || "-",
          phone: emp.phone || u.phone || "-",
          active: toBool(emp.active ?? u.active),

          // ✅ avatarUrl เก็บเป็น storagePath (เช่น profile/{uid}/...)
          avatarUrl: (emp.avatarUrl ?? u.avatarUrl) || null,
        };

        if (!alive) return;

        setProfile(merged);

        if (empDenied) {
          setErrorMsg("อ่านข้อมูลพนักงาน (employees) ไม่ได้ — แต่แสดงโปรไฟล์พื้นฐานจาก users ให้แล้ว");
        }
      } catch (e: any) {
        console.error(e);
        if (!alive) return;

        if (isPermissionError(e)) {
          setErrorMsg("สิทธิ์ไม่พอในการอ่านข้อมูลโปรไฟล์ (Firestore Rules บล็อกอยู่)");
        } else {
          setErrorMsg("โหลดโปรไฟล์ไม่สำเร็จ");
        }

        setProfile(null);
      } finally {
        if (alive) setFetching(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [user?.uid, user?.email, loading, reloadKey]);

  return { profile, fetching, errorMsg };
}
