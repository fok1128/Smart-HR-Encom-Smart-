import PageMeta from "../../components/common/PageMeta";
import AnnouncementsPage from "./AnnouncementsPage";


export default function Home() {
  return (
    <>
      <PageMeta
        title="Smart HR @PEA ENCOM SMART"
        description="Smart HR - Announcements"
      />
      <AnnouncementsPage />
    </>
  );
}
