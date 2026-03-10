export default function MainLayout({ children }) {

  return (

    <div className="flex h-screen bg-gray-100">

      {/* Sidebar */}

      <div className="w-64 bg-white border-r">

        <div className="p-6 text-xl font-bold text-blue-600">
          MediCare
        </div>

        <nav className="px-4 space-y-2">

          <div className="p-2 rounded bg-blue-100">
            Dashboard
          </div>

          <div className="p-2 rounded hover:bg-gray-100">
            Patients
          </div>

          <div className="p-2 rounded hover:bg-gray-100">
            Risk Assessment
          </div>

          <div className="p-2 rounded hover:bg-gray-100">
            Reports
          </div>

          <div className="p-2 rounded hover:bg-gray-100">
            Settings
          </div>

        </nav>

      </div>

      {/* Main content */}

      <div className="flex-1 p-8 overflow-auto">

        {children}

      </div>

    </div>

  )

}