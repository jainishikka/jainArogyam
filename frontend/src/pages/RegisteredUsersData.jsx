import { useEffect, useState } from "react";
import { Databases, Client, Query } from "appwrite";
import envt_imports from "../envt_imports/envt_imports";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSortUp, faSortDown, faArrowsUpDown } from "@fortawesome/free-solid-svg-icons";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

const RegisteredUsersData = () => {
  const client = new Client()
    .setEndpoint(envt_imports.appwriteUrl)
    .setProject(envt_imports.appwriteProjectId);

  const databases = new Databases(client);
  const DATABASE_ID = envt_imports.appwriteDatabaseId;
  const COLLECTION_ID = envt_imports.appwriteCollection2Id;

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [searchMobile, setSearchMobile] = useState("");
const [searchName, setSearchName] = useState("");

// Modal and password state
const [showModal, setShowModal] = useState(false);
const [passwordInput, setPasswordInput] = useState("");
const [errorMsg, setErrorMsg] = useState("");
// Set your download password here or load from env
const DOWNLOAD_PASSWORD = envt_imports.downloadPassword;


useEffect(() => {
  const lowerCaseMobile = searchMobile.toLowerCase();
  const lowerCaseName = searchName.toLowerCase();

  const filtered = users.filter((user) => {
    const matchesMobile = user.MobileNumber?.toLowerCase().includes(lowerCaseMobile);
    const matchesName =
      user.FirstName?.toLowerCase().includes(lowerCaseName) ||
      user.LastName?.toLowerCase().includes(lowerCaseName);
    return (!searchMobile || matchesMobile) && (!searchName || matchesName);
  });

  setFilteredUsers(filtered);
}, [searchMobile, searchName, users]);

  const navigate = useNavigate();

  const fetchUsers = async () => {
    let allUsers = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    try {
      while (hasMore) {
        const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
          Query.limit(limit),
          Query.offset(offset),
          Query.orderDesc("$createdAt"),
        ]);

        if (response.documents.length > 0) {
          allUsers = [...allUsers, ...response.documents];
          offset += response.documents.length;
        } else {
          hasMore = false;
        }
      }

      setUsers(allUsers);
      setFilteredUsers(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      setErrorMessage("Failed to fetch users data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCSVDownload = () => {
    const csvHeaders = [
      "Registration No",
      "First Name",
      "Last Name",
      "Gender",
      "Email",
      "Date Of Birth",
      "Mobile",
      "Created Date",
    ];

    const csvContent = [
      csvHeaders.join(","),
      ...filteredUsers.map((user) =>
        [
          user.RegistrationNumber || "",
          user.FirstName || "",
          user.LastName || "",
          user.Gender || "",
          user.PatientEmail || "",
          user.Date_Of_Birth
            ? new Date(user.Date_Of_Birth).toLocaleDateString()
            : "",
          user.MobileNumber || "",
          new Date(user.$createdAt).toLocaleString("en-GB"),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "registered_users_data.csv";
    link.click();
    URL.revokeObjectURL(url);
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

  const sortData = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    const sortedData = [...filteredUsers].sort((a, b) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredUsers(sortedData);
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "asc" ? (
        <FontAwesomeIcon icon={faSortUp} />
      ) : (
        <FontAwesomeIcon icon={faSortDown} />
      );
    }
    return <FontAwesomeIcon icon={faArrowsUpDown} />;
  };

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const currentPageData = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  
 return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 to-blue-500 p-6">
      <div className="max-w-full mx-auto bg-white rounded-lg shadow-xl p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Registered Users Data
        </h1>
        {/* Navigation and Download Buttons */}
        <button
          onClick={() => navigate("/admin-dashboard")}
          className="mb-6 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          Live Appointment Diary
        </button>
        <button
          onClick={downloadData}
          className="mb-6 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Download Data
        </button>
        

        {/* Error Message */}
        {errorMessage && (
          <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
            {errorMessage}
          </div>
        )}

        {/* Filters and Search */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="p-2 border rounded-md"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="p-2 border rounded-md"
          />
          <button
            onClick={() =>
              setFilteredUsers(
                users.filter((user) => {
                  const createdDate = new Date(user.$createdAt);
                  return (
                    (!fromDate || createdDate >= new Date(fromDate)) &&
                    (!toDate || createdDate <= new Date(toDate))
                  );
                })
              )
            }
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Apply Filter
          </button>
        </div>

        <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
  <input
    type="text"
    value={searchMobile}
    onChange={(e) => setSearchMobile(e.target.value)}
    className="p-2 border rounded-md"
    placeholder="Search by Mobile Number..."
  />
  <input
    type="text"
    value={searchName}
    onChange={(e) => setSearchName(e.target.value)}
    className="p-2 border rounded-md"
    placeholder="Search by Name (First/Last)..."
  />
  <button
    onClick={() => {
      setSearchMobile("");
      setSearchName("");
      setFilteredUsers(users);
    }}
    className="bg-blue-600 text-white px-4 py-2 rounded-lg"
  >
    Clear Filters
  </button>
</div>

        

        {/* Data Table */}
        {loading && <FontAwesomeIcon icon={faSpinner} spin />}
        {!loading && (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-200">
                <tr>
                  {[
                    { label: "Registration No", key: "RegistrationNumber" },
                    { label: "First Name", key: "FirstName" },
                    { label: "Last Name", key: "LastName" },
                    { label: "Gender", key: "Gender" },
                    { label: "Email", key: "PatientEmail" },
                    { label: "Date Of Birth", key: "Date_Of_Birth" },
                    { label: "Mobile", key: "MobileNumber" },
                    { label: "Created Date", key: "$createdAt" },
                  ].map((column) => (
                    <th
                      key={column.key}
                      className="px-4 py-2 border cursor-pointer"
                      onClick={() => sortData(column.key)}
                    >
                      {column.label} {getSortIcon(column.key)}
                    </th>
                  ))}
                </tr>
              </thead>
               <tbody>
                {currentPageData.map((user) => (
                  <tr key={user.$id} className="border-b">
                    <td className="px-4 py-2">{user.RegistrationNumber || "N/A"}</td>
                    <td className="px-4 py-2">{user.FirstName || "N/A"}</td>
                    <td className="px-4 py-2">{user.LastName || "N/A"}</td>
                    <td className="px-4 py-2">{user.Gender || "N/A"}</td>
                    <td className="px-4 py-2">{user.PatientEmail || "N/A"}</td>
                    <td className="px-4 py-2">
                      {user.Date_Of_Birth
                        ? new Date(user.Date_Of_Birth).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="px-4 py-2">{user.MobileNumber || "N/A"}</td>
                    <td className="px-4 py-2">
                      {new Date(user.$createdAt).toLocaleString("en-GB")}
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>

            <div className="mt-4 flex justify-center space-x-2">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1 rounded ${
                    page === currentPage
                      ? "bg-blue-500 text-white"
                      : "bg-gray-300"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
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

export default RegisteredUsersData;
