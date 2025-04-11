import { format } from "date-fns";
import { useState, useEffect } from "react";
import { Databases, Client, Query } from "appwrite";
import envt_imports from "../envt_imports/envt_imports";
import '@fortawesome/fontawesome-free/css/all.min.css';
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const client = new Client()
    .setEndpoint(envt_imports.appwriteUrl)
    .setProject(envt_imports.appwriteProjectId);

  const databases = new Databases(client);

  const DATABASE_ID = envt_imports.appwriteDatabaseId;
  const COLLECTION_ID = envt_imports.appwriteCollectionId;
  const FINAL_COLLECTION_ID = envt_imports.appwriteFinalDataCollectionId;
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [displayedPatients, setDisplayedPatients] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: "asc" });
  const [searchDateFrom, setSearchDateFrom] = useState("");
  const [searchDateTo, setSearchDateTo] = useState("");
  const [searchRegNumber, setSearchRegNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchMobileNumber, setSearchMobileNumber] = useState("");
  const [searchName, setSearchName] = useState("");

  const fetchActivePatients = async (queryConditions = []) => {
    try {
      setIsLoading(true);
      const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
        ...queryConditions,
        Query.orderDesc("AppointmentDate"),
      ]);
      setPatients(response.documents || []);
    } catch (error) {
      console.error("Error fetching active patients:", error);
      setErrorMessage("Failed to fetch patient records. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalizeRecord = async (patient) => {
    const requiredFields = [
      { field: "PatientProblem", label: "Patient Problem" },
      { field: "DoctorAttended", label: "Doctor Attended" },
      { field: "TreatmentDone", label: "Treatment Done" },
      { field: "PaymentMode", label: "Payment Mode" },
    ];
  
    // Check if any required field is empty
    const missingFields = requiredFields.filter(
      ({ field }) => !patient[field] || patient[field].toString().trim() === ""
    );
  
    if (missingFields.length > 0) {
      const missingFieldNames = missingFields.map((f) => f.label).join(", ");
      toast.error(`Please fill in the following required fields: ${missingFieldNames}`);
      return; // Exit the function early if validation fails
    }
  
    try {
      // Destructure to remove unnecessary fields before saving
      const { $id, $databaseId, $collectionId, $createdAt, $updatedAt, AppointmentDate, ...dataToMove } = patient;
  
      const dataToInsert = {
        ...dataToMove,
        AppointmentDates: AppointmentDate || null,
      };
  
      // Always create a new record in the FINAL_COLLECTION_ID
      await databases.createDocument(DATABASE_ID, FINAL_COLLECTION_ID, "unique()", dataToInsert);
  
      // Remove the record from the current collection
      await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, $id);
  
      // Update UI state
      setPatients((prev) => prev.filter((p) => p.$id !== $id));
      toast.success("Record successfully finalized.");
    } catch (error) {
      console.error("Error finalizing record:", error);
      toast.error(`Failed to finalize the record. Error: ${error.message}`);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const queryConditions = [];
      if (searchRegNumber) {
        queryConditions.push(Query.equal("RegistrationNumber", searchRegNumber));
      }
      if (searchDateFrom && searchDateTo) {
        const startFrom = new Date(searchDateFrom).toISOString();
        const endTo = new Date(searchDateTo).setHours(23, 59, 59, 999);
        queryConditions.push(Query.between("AppointmentDate", startFrom, new Date(endTo).toISOString()));
      }

      // Fetch all patients first
      const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID);
      const filteredPatients = response.documents.filter((patient) =>
        patient.PatientName.toLowerCase().includes(searchName.toLowerCase())
      );
      setPatients(filteredPatients);
    } catch (error) {
      console.error("Error during search:", error);
      setErrorMessage("Search failed. Please check your input and try again.");
    }
  };

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID);
      setPatients(response.documents || []);
    } catch (error) {
      console.error("Error fetching patients:", error);
      setErrorMessage("Failed to fetch records. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const sortPatients = (field) => {
    const direction =
      sortConfig.field === field && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({ field, direction });
  
    const sortedPatients = [...patients].sort((a, b) => {
      const valA = a[field] || "";
      const valB = b[field] || "";
  
      if (typeof valA === "string" && typeof valB === "string") {
        return direction === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else if (typeof valA === "number" && typeof valB === "number") {
        return direction === "asc" ? valA - valB : valB - valA;
      } else if (valA instanceof Date && valB instanceof Date) {
        return direction === "asc"
          ? new Date(valA) - new Date(valB)
          : new Date(valB) - new Date(valA);
      }
      return 0;
    });
  
    setPatients(sortedPatients);
  };
  
  useEffect(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    setDisplayedPatients(patients.slice(startIndex, endIndex));
  }, [patients, currentPage, rowsPerPage]);

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleFieldChange = (id, field, value) => {
    setPatients((prev) =>
      prev.map((patient) =>
        patient.$id === id
          ? {
              ...patient,
              [field]: field === "RemainingSessions" ? parseInt(value, 10) || 0 : value,
            }
          : patient
      )
    );
  };

  const handleUpdate = async (id, updatedData) => {
    try {
      const {
        $id,
        $databaseId,
        $collectionId,
        $permissions,
        $createdAt,
        $updatedAt,
        ...dataToUpdate
      } = updatedData;
  
      if ("PackagePurchased" in dataToUpdate) {
        dataToUpdate.PackagePurchased = Boolean(dataToUpdate.PackagePurchased);
      }
      if ("PaymentReceived" in dataToUpdate) {
        dataToUpdate.PaymentReceived = Boolean(dataToUpdate.PaymentReceived);
      }
      if ("RemainingSessions" in dataToUpdate) {
        dataToUpdate.RemainingSessions = Number(dataToUpdate.RemainingSessions) || 0;
      }
      if ("Payment" in dataToUpdate) {
        dataToUpdate.Payment = Number(dataToUpdate.Payment) || 0;
      }
      
      const response = await databases.updateDocument(DATABASE_ID, COLLECTION_ID, id, dataToUpdate);
  
      setPatients((prev) =>
        prev.map((patient) =>
          patient.$id === id ? { ...patient, ...response } : patient
        )
      );
  
      alert("Record updated successfully!");
    } catch (error) {
      console.error("Failed to update record:", error);
      alert(`Failed to update the record. Error: ${error.message}`);
    }
  };

  useEffect(() => {
    fetchActivePatients();
  }, []);

  const headers = [
    { label: "Registration Number", field: "RegistrationNumber" },
    { label: "Appointment Date", field: "AppointmentDate" },
    { label: "Appointment Time", field: "AppointmentTime" },
    { label: "Patient Name", field: "PatientName" },
    { label: "Patient Problem", field: "PatientProblem" },
    { label: "Doctor Attended", field: "DoctorAttended" },
    { label: "Treatment Done", field: "TreatmentDone" },
    { label: "Package Purchased", field: "PackagePurchased" },
    { label: "Payment Received", field: "PaymentReceived" },
    { label: "Payment", field: "Payment" },
    { label: "Payment Mode", field: "PaymentMode" },
    { label: "Remarks", field: "Remarks" },
  ];
  
  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 p-6 overflow-hidden">
      <div className="max-w-full mx-auto bg-white rounded-lg shadow-xl p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">Jain Arogyam</h1>
        <h3 className="text-md text-gray-500 mb-6 text-center">Live appointment diary</h3>
  
        {/* Navigation Buttons */}
        <div className="mb-6 flex justify-between">
          <button
            onClick={() => navigate("/registered-users-data")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all"
          >
             Registered Users
          </button>
          <button
            onClick={() => navigate("/finalData")}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-all"
          >
            Historical Data
          </button>
          <button
            onClick={() => navigate("/login")}
            className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition-all"
          >
            Book Appointment
          </button>
        </div>
  
        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-6 flex flex-col md:flex-row gap-4">
          <input
            type="date"
            value={searchDateFrom}
            onChange={(e) => setSearchDateFrom(e.target.value)}
            placeholder="From Date"
            className="border rounded-lg px-4 py-2 w-full"
          />
          <input
            type="date"
            value={searchDateTo}
            onChange={(e) => setSearchDateTo(e.target.value)}
            placeholder="To Date"
            className="border rounded-lg px-4 py-2 w-full"
          />
          <input
            type="text"
            value={searchRegNumber}
            onChange={(e) => setSearchRegNumber(e.target.value)}
            placeholder="Registration Number"
            className="border rounded-lg px-4 py-2 w-full"
          />
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Name"
            className="border rounded-lg px-4 py-2 w-full"
          />
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all"
          >
            Search
          </button>
        </form>
  
        {/* Error Message */}
        {errorMessage && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4 text-center">
            {errorMessage}
          </div>
        )}
  
        {/* Loading Spinner */}
        {isLoading ? (
          <div className="flex justify-center items-center py-6">
            <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-16 w-16"></div>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="table-auto w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  {headers.map(({ label, field }) => (
                    <th
                      key={field}
                      className="px-6 py-2 border border-gray-300 text-left cursor-pointer"
                      onClick={() => sortPatients(field)}
                    >
                      {label}
                      <span className="ml-2">
                        {sortConfig.field === field && (
                          sortConfig.direction === "asc" ? (
                            <i className="fas fa-arrow-up text-gray-500"></i>
                          ) : (
                            <i className="fas fa-arrow-down text-gray-500"></i>
                          )
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
  
              <tbody>
                {patients.length > 0 ? (
                  patients.map((patient) => (
                    <tr key={patient.$id}>
                      {[
                        { field: "RegistrationNumber", type: "text", minWidth: "200px" },
                        {
                          field: "AppointmentDate",
                          type: "date",
                          minWidth: "150px",
                          formatValue: (value) =>
                            value ? new Date(value).toISOString().slice(0, 10) : "",
                        },
                        {
                          field: "AppointmentTime",
                          type: "time",
                          minWidth: "150px",
                          formatValue: () =>
                            patient.AppointmentDate ? format(new Date(patient.AppointmentDate), "HH:mm:ss") : "",
                        },
                        { field: "PatientName", type: "text", minWidth: "250px" },
                        { field: "PatientProblem", type: "text", minWidth: "300px" },
                        { field: "DoctorAttended", type: "text", minWidth: "200px" },
                        { field: "TreatmentDone", type: "text", minWidth: "200px" },
                      ].map(({ field, type, minWidth, formatValue }) => {
                        // Compute the display value. For AppointmentTime, we use the computed format.
                        const displayValue =
                          field === "AppointmentTime"
                            ? (patient.AppointmentDate ? format(new Date(patient.AppointmentDate), "HH:mm:ss") : "")
                            : (formatValue ? formatValue(patient[field]) : patient[field] || "");
  
                        return (
                          <td
                            key={`${patient.$id}-${field}`}
                            className="px-6 py-2 border"
                            style={{ minWidth }}
                          >
                            <input
                              type={type}
                              value={displayValue}
                              onChange={(e) =>
                                field === "AppointmentTime"
                                  ? null
                                  : handleFieldChange(patient.$id, field, e.target.value)
                              }
                              className="border rounded px-2 py-1 w-full"
                              readOnly={field === "AppointmentTime"}
                            />
                          </td>
                        );
                      })}
                      <td className="px-6 py-2 border text-center">
                        <input
                          type="checkbox"
                          checked={patient.PackagePurchased || false}
                          onChange={(e) =>
                            handleFieldChange(patient.$id, "PackagePurchased", e.target.checked)
                          }
                          className="h-5 w-5"
                        />
                      </td>
                      <td className="px-6 py-2 border text-center">
                        <input
                          type="checkbox"
                          checked={patient.PaymentReceived || false}
                          onChange={(e) =>
                            handleFieldChange(patient.$id, "PaymentReceived", e.target.checked)
                          }
                          className="h-5 w-5"
                        />
                      </td>
                      <td className="px-6 py-2 border">
                        <input
                          type="number"
                          value={patient.Payment || 0}
                          onChange={(e) =>
                            handleFieldChange(patient.$id, "Payment", parseInt(e.target.value, 10) || 0)
                          }
                          className="border rounded px-2 py-1 w-full"
                        />
                      </td>
                      <td className="px-6 py-2 border">
                        <select
                          value={patient.PaymentMode || ""}
                          onChange={(e) =>
                            handleFieldChange(patient.$id, "PaymentMode", e.target.value)
                          }
                          className="border rounded px-2 py-1 w-full bg-yellow-100 focus:ring-2 focus:ring-yellow-400"
                        >
                          <option value="" disabled>
                            Select Payment Mode
                          </option>
                          <option value="cash">Cash</option>
                          <option value="upi">UPI</option>
                          <option value="at subscription">At Subscription</option>
                        </select>
                      </td>
                      <td className="px-6 py-2 border">
                        <input
                          type="text"
                          value={patient.Remarks || ""}
                          onChange={(e) =>
                            handleFieldChange(patient.$id, "Remarks", e.target.value)
                          }
                          className="border rounded px-2 py-1 w-full"
                        />
                      </td>
                      <td className="px-6 py-2 border text-center">
                        <button
                          onClick={() => handleFinalizeRecord(patient)}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                          aria-label={`Finalize record for ${patient.PatientName}`}
                        >
                          Finalize
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="12" className="text-center py-4">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
  
        {/* Pagination Controls */}
        <div className="mt-4 flex justify-center space-x-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
            className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
          >
            Previous
          </button>
          {[...Array(Math.ceil(patients.length / rowsPerPage)).keys()].map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => setCurrentPage(pageNum + 1)}
              className={`px-4 py-2 rounded ${
                currentPage === pageNum + 1 ? "bg-blue-500 text-white" : "bg-gray-300"
              }`}
            >
              {pageNum + 1}
            </button>
          ))}
          <button
            disabled={currentPage === Math.ceil(patients.length / rowsPerPage)}
            onClick={() => setCurrentPage((prev) => prev + 1)}
            className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
