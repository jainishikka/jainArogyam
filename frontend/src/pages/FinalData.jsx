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

  // Compute total payment for filtered patients
  const totalPayment = useMemo(() => {
    return filteredPatients.reduce((sum, patient) => {
      const payment = parseFloat(patient.Payment) || 0;
      return sum + payment;
    }, 0);
  }, [filteredPatients]);

  const fetchFinalizedPatients = async () => {
    let allPatients = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    try {
      setIsLoading(true);
      const queries = [];

      if (startDate && endDate) {
        const { startOfDay } = getStartAndEndOfDay(startDate);
        const { endOfDay } = getStartAndEndOfDay(endDate);
        queries.push(Query.between("AppointmentDates", startOfDay, endOfDay));
      }

      if (registrationSearch) {
        queries.push(Query.equal("RegistrationNumber", registrationSearch));
      }

      if (nameSearch) {
        queries.push(Query.search("PatientName", nameSearch));
      }

      queries.push(Query.orderDesc("AppointmentDates"));

      while (hasMore) {
        const response = await databases.listDocuments(
          DATABASE_ID,
          FINAL_COLLECTION_ID,
          [...queries, Query.limit(limit), Query.offset(offset)]
        );
        allPatients = [...allPatients, ...response.documents];
        offset += response.documents.length;
        hasMore = response.documents.length === limit;
      }

      setFinalizedPatients(allPatients);
      setFilteredPatients(allPatients);
    } catch (err) {
      console.error("Error fetching finalized patients:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinalizedPatients();
  }, []);

  const applyFilters = () => {
    const filtered = finalizedPatients.filter((patient) => {
      const date = new Date(patient.AppointmentDates);
      return (
        (!startDate || date >= new Date(startDate)) &&
        (!endDate || date <= new Date(endDate)) &&
        (!registrationSearch || patient.RegistrationNumber?.includes(registrationSearch)) &&
        (!nameSearch || patient.PatientName?.toLowerCase().includes(nameSearch.toLowerCase()))
      );
    });
    setFilteredPatients(filtered);
    setCurrentPage(1);
  };

  useEffect(() => {
    applyFilters();
  }, [startDate, endDate, registrationSearch, nameSearch, finalizedPatients]);

  const getStartAndEndOfDay = (dateString) => {
    const date = new Date(dateString);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(date.setHours(23, 59, 59, 999)).toISOString();
    return { startOfDay, endOfDay };
  };

  // Pagination setup
  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / itemsPerPage));
  const currentPageData = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const paginate = (page) => setCurrentPage(page);
  const handlePrevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const handleNextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  const downloadData = () => {
    const headers = [
      "Registration Number", "Appointment Date", "Appointment Time", "Patient Name",
      "Patient Problem", "Doctor Attended", "Treatment Done", "Package Purchased",
      "Remaining Sessions", "Payment Received", "Payment Mode", "Payment", "Remarks"
    ];
    const rows = filteredPatients.map(p => [
      p.RegistrationNumber || "",
      p.AppointmentDates ? new Date(p.AppointmentDates).toLocaleDateString() : "",
      p.AppointmentDates ? format(new Date(p.AppointmentDates), "HH:mm:ss") : "",
      p.PatientName || "",
      p.PatientProblem || "",
      p.DoctorAttended || "",
      p.TreatmentDone || "",
      p.PackagePurchased || "",
      p.RemainingSessions || "",
      p.PaymentReceived || "",
      p.PaymentMode || "",
      p.Payment || "",
      p.Remarks || ""
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${v}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "finalized_patients.csv";
    link.click();
  };

  const sortData = (key) => {
    let dir = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") dir = "desc";
    setSortConfig({ key, direction: dir });
    const sorted = [...filteredPatients].sort((a, b) => {
      if (dir === "asc") return a[key] > b[key] ? 1 : -1;
      return a[key] < b[key] ? 1 : -1;
    });
    setFilteredPatients(sorted);
  };

  const getSortIcon = (key) => {
    if (sortConfig.key === key) return sortConfig.direction === "asc" ? "▲" : "▼";
    return "⇅";
  };

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
            <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2" />
          </div>
          <div className="flex flex-col">
            <label htmlFor="endDate" className="text-sm font-semibold mb-2">End Date</label>
            <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2" />
          </div>
          <div className="flex flex-col">
            <label htmlFor="registrationSearch" className="text-sm font-semibold mb-2">Registration Number</label>
            <input type="text" id="registrationSearch" value={registrationSearch} onChange={e => setRegistrationSearch(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2" />
          </div>
          <div className="flex flex-col">
            <label htmlFor="nameSearch" className="text-sm font-semibold mb-2">Patient Name</label>
            <input type="text" id="nameSearch" value={nameSearch} onChange={e => setNameSearch(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2" />
          </div>
          <button onClick={fetchFinalizedPatients} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-all">Search</button>
        </div>

        <div className="flex gap-4 mb-6">
          <button onClick={downloadData} className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-all">Download Data</button>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all">Showing {currentPageData.length} of {filteredPatients.length}</button>
          <button className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 transition-all">Total Payment: {totalPayment}</button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="loader ease-linear rounded-full border-8 border-t-8 border-indigo-300 h-16 w-16"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse border border-gray-300 shadow-md">
              <thead>
                <tr className="bg-indigo-100 text-gray-700">
                  {[
                    { key: "RegistrationNumber", label: "Registration Number" },
                    { key: "AppointmentDates", label: "Appointment Date" },
                    { key: "AppointmentTime", label: "Appointment Closed At" },
                    { key: "PatientName", label: "Patient Name" },
                    { key: "PatientProblem", label: "Patient Problem" },
                    { key: "DoctorAttended", label: "Doctor Attended" },
                    { key: "TreatmentDone", label: "Treatment Done" },
                    { key: "PackagePurchased", label: "Package Purchased" },
                    { key: "RemainingSessions", label: "Remaining Sessions" },
                    { key: "PaymentReceived", label: "Payment Received" },
                    { key: "Payment", label: "Payment" },
                    { key: "PaymentMode", label: "Payment Mode" },
                    { key: "Remarks", label: "Remarks" },
                  ].map(column => (
                    <th key={column.key} className="border border-gray-300 px-6 py-3 text-left text-sm font-semibold cursor-pointer" onClick={() => sortData(column.key)}>
                      {column.label} {getSortIcon(column.key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentPageData.length ? (
                  currentPageData.map(patient => (
                    <tr key={patient.$id} className="border-b hover:bg-indigo-50">
                      {[
                        "RegistrationNumber", "AppointmentDates", "AppointmentTime",
                        "PatientName", "PatientProblem", "DoctorAttended", "TreatmentDone",
                        "PackagePurchased", "RemainingSessions", "PaymentReceived",
                        "Payment", "PaymentMode", "Remarks"
                      ].map(field => (
                        <td key={field} className="border border-gray-300 px-6 py-3 text-sm">
                          {field === "AppointmentDates"
                            ? patient[field] ? new Date(patient[field]).toLocaleDateString() : "N/A"
                            : field === "AppointmentTime"
                            ? patient.AppointmentDates ? format(new Date(patient.AppointmentDates), "HH:mm:ss") : "N/A"
                            : (field === "PackagePurchased" || field === "PaymentReceived")
                            ? <input type="checkbox" checked={patient[field]} disabled className="w-5 h-5"/>
                            : patient[field] || "N/A"
                          }
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={13} className="text-center py-4 text-gray-600">No records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex justify-center mt-6">
          <button onClick={handlePrevPage} disabled={currentPage === 1} className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:bg-gray-300 mr-2">Prev</button>
          {[...Array(totalPages)].map((_, i) => (
            <button key={i} onClick={() => paginate(i+1)} className={`px-4 py-2 rounded-lg ${currentPage===i+1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-black'}`}>{i+1}</button>
          ))}
          <button onClick={handleNextPage} disabled={currentPage===totalPages} className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:bg-gray-300 ml-2">Next</button>
        </div>
      </div>
    </div>
  );
};

export default FinalData;
