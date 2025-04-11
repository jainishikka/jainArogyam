import { format } from "date-fns";
import { useState, useEffect } from "react";
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
  const [isLoading, setIsLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [nameSearch, setNameSearch] = useState(""); 
  const [itemsPerPage] = useState(10);

  const fetchFinalizedPatients = async () => {
    let allPatients = [];
    let offset = 0;
    const limit = 100; // Appwrite fetches max 100 records per request
    let hasMore = true;
  
    try {
      setIsLoading(true);
      let queries = [];
  
      if (startDate && endDate) {
        const { startOfDay: startFrom } = getStartAndEndOfDay(startDate);
        const { endOfDay: endTo } = getStartAndEndOfDay(endDate);
        queries.push(Query.between("AppointmentDates", startFrom, endTo));
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
      setFilteredPatients(allPatients); // Avoid re-filtering after fetching
  
    } catch (error) {
      console.error("Error fetching finalized patients:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchFinalizedPatients();
  }, []);

  const applyFilters = () => {
    let filtered = finalizedPatients.filter((patient) => {
      return (
        (!startDate || new Date(patient.AppointmentDates) >= new Date(startDate)) &&
        (!endDate || new Date(patient.AppointmentDates) <= new Date(endDate)) &&
        (!registrationSearch || patient.RegistrationNumber?.includes(registrationSearch)) &&
        (!nameSearch || patient.PatientName?.toLowerCase().includes(nameSearch.toLowerCase()))
      );
    });

    setFilteredPatients(filtered);
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

  // For dynamic pagination
  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / itemsPerPage));
  const currentPageData = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const downloadData = () => {
    const csvHeaders = [
      "Registration Number",
      "Appointment Date",
      "Appointment Time",
      "Patient Name",
      "Patient Problem",
      "Doctor Attended",
      "Treatment Done",
      "Package Purchased",
      "Remaining Sessions",
      "Payment Received",
      "Payment Mode",
      "Payment",
      "Remarks",
    ];

    // Map data to ensure it aligns correctly with headers
    const csvContent = [
      csvHeaders.join(","),
      ...filteredPatients.map((patient) => {
        return [
          patient.RegistrationNumber || "",
          patient.AppointmentDates ? new Date(patient.AppointmentDates).toLocaleDateString() : "N/A",
          patient.AppointmentDates ? format(new Date(patient.AppointmentDates), "HH:mm:ss") : "N/A",
          patient.PatientName || "",
          patient.PatientProblem || "",
          patient.DoctorAttended || "",
          patient.TreatmentDone || "",
          patient.PackagePurchased || "",
          patient.RemainingSessions || "",
          patient.PaymentReceived || "",
          patient.PaymentMode || "",
          patient.Payment || "",
          patient.Remarks || "",
        ].map((value) => `"${value}"`).join(",");
      }),
    ].join("\n");
    
    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "finalized_patients_data.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const sortData = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  
    const sortedPatients = [...filteredPatients].sort((a, b) => {
      if (direction === "asc") {
        return a[key] > b[key] ? 1 : -1;
      } else {
        return a[key] < b[key] ? 1 : -1;
      }
    });
  
    setFilteredPatients(sortedPatients); // Fix: Apply sorting to filteredPatients
  };
  
  const getSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "asc" ? "▲" : "▼";
    }
    return "⇅";
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 p-6 overflow-hidden">
      <div className="max-w-full mx-auto bg-white rounded-lg shadow-xl p-6">
        <h1 className="text-4xl font-bold text-blue-800 text-center mb-8">
          Historical Data
        </h1>

        <div className="flex justify-center gap-6 mb-8">
          <Link
            to="/admin-dashboard"
            className="bg-blue-600 text-white py-3 px-6 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 ease-in-out transform hover:scale-105"
          >
            Live Appointment Diary
          </Link>
          <Link
            to="/registered-users-data"
            className="bg-indigo-600 text-white py-3 px-6 rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 ease-in-out transform hover:scale-105"
          >
             Registered Users
          </Link>
        </div>

        <div className="flex flex-wrap gap-6 mb-8 items-center justify-center">
          <div className="flex flex-col">
            <label htmlFor="startDate" className="text-sm font-semibold mb-2">Start Date</label>
            <input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2" />
          </div>
          <div className="flex flex-col">
            <label htmlFor="endDate" className="text-sm font-semibold mb-2">End Date</label>
            <input type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2" />
          </div>
          <div className="flex flex-col">
            <label htmlFor="registrationSearch" className="text-sm font-semibold mb-2">Registration Number</label>
            <input type="text" id="registrationSearch" value={registrationSearch} onChange={(e) => setRegistrationSearch(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2" />
          </div>
          <div className="flex flex-col">
            <label htmlFor="nameSearch" className="text-sm font-semibold mb-2">Patient Name</label>
            <input type="text" id="nameSearch" value={nameSearch} onChange={(e) => setNameSearch(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2" />
          </div>
          <button onClick={fetchFinalizedPatients} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-all">
            Search
          </button>
        </div>

        <div className="flex gap-4 mt-4">
          <button
            onClick={downloadData}
            className="bg-green-500 text-white px-6 py-2 rounded-lg shadow-lg hover:bg-green-600 transition-all"
          >
            Download Data
          </button>

          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-all">
            Showing {currentPageData.length} records out of {filteredPatients.length} total
          </button>
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
                  ].map((column) => (
                    <th
                      key={column.key}
                      className="border border-gray-300 px-6 py-3 text-left text-sm font-semibold cursor-pointer"
                      onClick={() => sortData(column.key)}
                    >
                      {column.label} <span>{getSortIcon(column.key)}</span>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {currentPageData.length > 0 ? (
                  currentPageData.map((patient) => (
                    <tr key={patient.$id} className="border-b hover:bg-indigo-50">
                      {[
                        "RegistrationNumber",
                        "AppointmentDates",
                        "AppointmentTime",
                        "PatientName",
                        "PatientProblem",
                        "DoctorAttended",
                        "TreatmentDone",
                        "PackagePurchased",
                        "RemainingSessions",
                        "PaymentReceived",
                        "Payment",
                        "PaymentMode",
                        "Remarks",
                      ].map((field) => (
                        <td key={field} className="border border-gray-300 px-6 py-3 text-sm">
                          {field === "AppointmentDates"
                            ? patient[field]
                              ? new Date(patient[field]).toLocaleDateString()
                              : "N/A"
                            : field === "AppointmentTime"
                            ? patient.AppointmentDates
                              ? format(new Date(patient.AppointmentDates), "HH:mm:ss")
                              : "N/A"
                            : field === "PackagePurchased" || field === "PaymentReceived"
                            ? (
                                <input
                                  type="checkbox"
                                  checked={patient[field] === true}
                                  disabled
                                  className="w-5 h-5"
                                />
                              )
                            : patient[field] || "N/A"}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="13" className="text-center py-4 text-sm text-gray-600">
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex justify-center mt-6">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:bg-gray-300 mr-2"
          >
            Prev
          </button>
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index}
              onClick={() => paginate(index + 1)}
              className={`px-4 py-2 rounded-lg ${currentPage === index + 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-black'}`}
            >
              {index + 1}
            </button>
          ))}
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:bg-gray-300 ml-2"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinalData;
