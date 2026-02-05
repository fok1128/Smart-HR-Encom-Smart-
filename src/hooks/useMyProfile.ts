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
  fname?: string;   // ✅ เผื่อบางโปรเจกต์เก็บไว้ใน users
  lname?: string;
  position?: string;
  phone?: string;
};

type EmployeeDoc = {
  fname?: string;
  lname?: string;
  position?: string;
  departmentId?: string;
  phone?: string;
  active?: string | boolean;
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
  } | null>(null);

  const [fetching, setFetching] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        // 1) users/{uid} (ควรอ่านได้แน่)
        const uSnap = await getDoc(doc(db, "users", user.uid));
        const u = (uSnap.exists() ? (uSnap.data() as UserDoc) : {}) as UserDoc;

        const employeeNo = u.employeeNo || "";
        const email = u.email || user.email || "";
        const role = String(u.role || "USER").toUpperCase();

        // 2) employees/{employeeNo} (อาจโดน rules บล็อก)
        let emp: EmployeeDoc = {};
        let empDenied = false;

        if (employeeNo) {
          try {
            const eSnap = await getDoc(doc(db, "employees", employeeNo));
            emp = eSnap.exists() ? (eSnap.data() as EmployeeDoc) : {};
          } catch (e: any) {
            if (isPermissionError(e)) {
              empDenied = true; // ✅ ไม่พัง แค่รู้ว่าอ่านไม่ได้
            } else {
              throw e; // error อื่นให้ขึ้นจริง
            }
          }
        }

        const merged = {
          email,
          employeeNo: employeeNo || "-",
          role,

          // ✅ ใช้ employees ก่อน ถ้าไม่มีค่อย fallback ไป users
          fname: emp.fname || u.fname || "-",
          lname: emp.lname || u.lname || "",
          position: emp.position || u.position || "-",
          departmentId: emp.departmentId || u.departmentId || "-",
          phone: emp.phone || u.phone || "-",
          active: toBool(emp.active ?? u.active),
        };

        if (!alive) return;

        setProfile(merged);

        // ✅ แจ้งเตือนแบบนิ่ม ๆ เฉพาะกรณี employees อ่านไม่ได้
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
  }, [user?.uid, user?.email, loading]);

  return { profile, fetching, errorMsg };
}
