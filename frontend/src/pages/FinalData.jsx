import { format } from "date-fns";
import { useState, useEffect, useMemo } from "react";
import { Databases, Query, Client } from "appwrite";
import envt_imports from "../envt_imports/envt_imports";
import { Link } from "react-router-dom";

const FinalData = () => {
  const client = new Client()
    .setEndpoint(envt_imports.appwriteUrl)
    .setProject(envt_imports.appwriteProjectId);
  const databases = new Databases(client);

  const DATABASE_ID = envt_imports.appwriteDatabaseId;
  const FINAL_COLLECTION_ID = envt_imports.appwriteFinalDataCollectionId;

  const [finalizedPatients, setFinalizedPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [registrationSearch, setRegistrationSearch] = useState("");
  const [nameSearch, setNameSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [appointmentClosedAtMap, setAppointmentClosedAtMap] = useState(() => {
    const stored = localStorage.getItem("appointmentClosedAtMap");
    return stored ? JSON.parse(stored) : {};
  });

  // Modal and password state
  const [showModal, setShowModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  // Set your download password here or load from env
  const DOWNLOAD_PASSWORD = envt_imports.downloadPassword;

  // Compute total payment for display
  const totalPayment = useMemo(() =>
    filteredPatients.reduce((sum, patient) => sum + (parseFloat(patient.Payment) || 0), 0),
  [filteredPatients]);

  // Fetch data from Appwrite
  const fetchFinalizedPatients = async () => {
    setIsLoading(true);
    let allPatients = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    try {
      const queries = [];
      if (startDate && endDate) {
        const { startOfDay, endOfDay } = getStartAndEndOfDay(startDate, endDate);
        queries.push(Query.between("AppointmentDates", startOfDay, endOfDay));
      }
      if (registrationSearch) queries.push(Query.equal("RegistrationNumber", registrationSearch));
      if (nameSearch) queries.push(Query.search("PatientName", nameSearch));
      queries.push(Query.orderDesc("AppointmentDates"));

      while (hasMore) {
        const res = await databases.listDocuments(
          DATABASE_ID,
          FINAL_COLLECTION_ID,
          [...queries, Query.limit(limit), Query.offset(offset)]
        );
        allPatients = allPatients.concat(res.documents);
        offset += res.documents.length;
        hasMore = res.documents.length === limit;
      }
      setFinalizedPatients(allPatients);
    } catch (error) {
      console.error("Error fetching finalized patients:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // On mount
  useEffect(() => {
    fetchFinalizedPatients();
  }, []);

  // Persist closed-at times
  useEffect(() => {
    setAppointmentClosedAtMap(prev => {
      const updated = { ...prev };
      let changed = false;
      finalizedPatients.forEach(p => {
        if (!updated[p.$id]) {
          updated[p.$id] = format(new Date(), "HH:mm:ss");
          changed = true;
        }
      });
      if (changed) localStorage.setItem("appointmentClosedAtMap", JSON.stringify(updated));
      return updated;
    });
  }, [finalizedPatients]);

  // Filter data
  const applyFilters = () => {
    const filtered = finalizedPatients.filter(p => {
      const date = new Date(p.AppointmentDates);
      return (
        (!startDate || date >= new Date(startDate)) &&
        (!endDate || date <= new Date(endDate)) &&
        (!registrationSearch || p.RegistrationNumber?.includes(registrationSearch)) &&
        (!nameSearch || p.PatientName?.toLowerCase().includes(nameSearch.toLowerCase()))
      );
    });
    setFilteredPatients(filtered);
    setCurrentPage(1);
  };

  useEffect(applyFilters, [startDate, endDate, registrationSearch, nameSearch, finalizedPatients]);

  // Helpers
  const getStartAndEndOfDay = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    return {
      startOfDay: new Date(s.setHours(0, 0, 0, 0)).toISOString(),
      endOfDay: new Date(e.setHours(23, 59, 59, 999)).toISOString(),
    };
  };

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / itemsPerPage));
  const currentPageData = filteredPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const paginate = page => setCurrentPage(page);
  const handlePrevPage = () => setCurrentPage(cp => Math.max(1, cp - 1));
  const handleNextPage = () => setCurrentPage(cp => Math.min(totalPages, cp + 1));

  // Password-protected download
  const handleCSVDownload = () => {
    const headers = [
      "Registration Number","Appointment Date","Appointment Closed At","Appointment Time",
      "Patient Name","Patient Problem","Doctor Attended","Treatment Done",
      "Payment Mode","Payment","Remarks"
    ];
    const rows = filteredPatients.map(p => [
      p.RegistrationNumber || "",
      p.AppointmentDates ? new Date(p.AppointmentDates).toLocaleDateString() : "",
      appointmentClosedAtMap[p.$id] || "",
      p.AppointmentDates ? format(new Date(p.AppointmentDates), "HH:mm:ss") : "",
      p.PatientName || "",
      p.PatientProblem || "",
      p.DoctorAttended || "",
      p.TreatmentDone || "",
      p.PaymentMode || "",
      p.Payment || "",
      p.Remarks || ""
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "finalized_patients.csv";
    link.click();
  };

   // Trigger modal
   const downloadData = () => { setPasswordInput(""); setErrorMsg(""); setShowModal(true); };

   // Validate password
   const confirmDownload = () => {
     if (passwordInput !== DOWNLOAD_PASSWORD) {
       setErrorMsg("Incorrect password");
       return;
     }
     setShowModal(false);
     handleCSVDownload();
   };

  // Sorting
  const sortData = key => {
    const direction = sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({ key, direction });
    setFilteredPatients(fp => [...fp].sort((a, b) =>
      direction === "asc" ? (a[key] > b[key] ? 1 : -1) : (a[key] < b[key] ? 1 : -1)
    ));
  };

  const getSortIcon = key =>
    sortConfig.key === key ? (sortConfig.direction === "asc" ? "▲" : "▼") : "⇅";

  // JSX
  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 p-6 overflow-hidden">
      <div className="max-w-full mx-auto bg-white rounded-lg shadow-xl p-6">
        <h1 className="text-4xl font-bold text-blue-800 text-center mb-8">Historical Data</h1>
        <div className="flex justify-center gap-6 mb-8">
          <Link to="/admin-dashboard" className="bg-blue-600 text-white py-3 px-6 rounded-full shadow-lg hover:bg-blue-700 transition-all">Live Appointment Diary</Link>
          <Link to="/registered-users-data" className="bg-indigo-600 text-white py-3 px-6 rounded-full shadow-lg hover:bg-indigo-700 transition-all">Registered Users</Link>
        </div>
        <div className="flex flex-wrap gap-6 mb-8 items-center justify-center">
          <div className="flex flex-col">
            <label htmlFor="startDate" className="text-sm font-semibold mb-2">Start Date</label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="endDate" className="text-sm font-semibold mb-2">End Date</label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="registrationSearch" className="text-sm font-semibold mb-2">Registration Number</label>
            <input
              id="registrationSearch"
              type="text"
              value={registrationSearch}
              onChange={e => setRegistrationSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="nameSearch" className="text-sm font-semibold mb-2">Patient Name</label>
            <input
              id="nameSearch"
              type="text"
              value={nameSearch}
              onChange={e => setNameSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2"
            />
          </div>
          <button
            onClick={fetchFinalizedPatients}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-all"
          >Search</button>
        </div>
        <div className="flex gap-4 mb-6">
          <button onClick={downloadData} className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-all">Download Data</button>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all">Showing {currentPageData.length} of {filteredPatients.length}</button>
          <button className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 transition-all">Total Payment: ₹{totalPayment.toLocaleString('en-IN')}</button>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="loader ease-linear rounded-full border-8 border-t-8 border-indigo-300 h-16 w-16"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse border border-gray-300 shadow-md">
              <thead className="bg-indigo-100 text-gray-700">
                <tr>
                  {[
                    { key: "RegistrationNumber", label: "Registration Number" },
                    { key: "AppointmentDates", label: "Appointment Date" },
                    { key: "AppointmentClosedAt", label: "Appointment Closed At" },
                    { key: "AppointmentTime", label: "Appointment Time" },
                    { key: "PatientName", label: "Patient Name" },
                    { key: "PatientProblem", label: "Patient Problem" },
                    { key: "DoctorAttended", label: "Doctor Attended" },
                    { key: "TreatmentDone", label: "Treatment Done" },
                    { key: "Payment", label: "Payment" },
                    { key: "PaymentMode", label: "Payment Mode" },
                    { key: "Remarks", label: "Remarks" }
                  ].map(col => (
                    <th key={col.key} onClick={() => sortData(col.key)} className="border px-6 py-3 text-left text-sm font-semibold cursor-pointer">{col.label} {getSortIcon(col.key)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentPageData.length > 0 ? currentPageData.map(p => (
                  <tr key={p.$id} className="border-b hover:bg-indigo-50">
                    <td className="px-6 py-3 text-sm">{p.RegistrationNumber || "N/A"}</td>
                    <td className="px-6 py-3 text-sm">{p.AppointmentDates ? new Date(p.AppointmentDates).toLocaleDateString() : "N/A"}</td>
                    <td className="px-6 py-3 text-sm">{appointmentClosedAtMap[p.$id] || "N/A"}</td>
                    <td className="px-6 py-3 text-sm">{p.AppointmentDates ? format(new Date(p.AppointmentDates), "HH:mm:ss") : "N/A"}</td>
                    <td className="px-6 py-3 text-sm">{p.PatientName || "N/A"}</td>
                    <td className="px-6 py-3 text-sm">{p.PatientProblem || "N/A"}</td>
                    <td className="px-6 py-3 text-sm">{p.DoctorAttended || "N/A"}</td>
                    <td className="px-6 py-3 text-sm">{p.TreatmentDone || "N/A"}</td>
                    <td className="px-6 py-3 text-sm">{p.Payment || "N/A"}</td>
                    <td className="px-6 py-3 text-sm">{p.PaymentMode || "N/A"}</td>
                    <td className="px-6 py-3 text-sm">{p.Remarks || "N/A"}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={11} className="text-center py-4 text-gray-600">No records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-center mt-6 gap-2">
          <button onClick={handlePrevPage} disabled={currentPage === 1} className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:bg-gray-300">Prev</button>
          {[...Array(totalPages)].map((_, i) => (
            <button key={i} onClick={() => paginate(i+1)} className={`px-4 py-2 rounded-lg ${currentPage===i+1? 'bg-indigo-600 text-white':'bg-gray-200 text-black'}`}>{i+1}</button>
          ))}
          <button onClick={handleNextPage} disabled={currentPage === totalPages} className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:bg-gray-300">Next</button>
        </div>
      </div>
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h2 className="text-xl font-semibold mb-4">Enter Password</h2>
            <input
              type="password"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2"
              placeholder="Password"
            />
            {errorMsg && <div className="text-red-500 text-sm mb-2">{errorMsg}</div>}
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
              >Cancel</button>
              <button
                onClick={confirmDownload}
                className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600"
              >Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinalData;
