import React from 'react';
import { RefreshCw, Download } from 'lucide-react';

const standardizeName = (name) => {
    if (!name) return '';
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/#S$/, '')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
};

const EnhancedMedicalRepDropdown = ({ selectedMR, setSelectedMR, getFilteredMedicalReps, selectedRegion, selectedTeam, teams, selectedState, salesAgents }) => {
    const { activeReps, inactiveReps } = getFilteredMedicalReps();

    const knownActiveReps = activeReps.filter(rep => rep.role_level === 'MR');
    const knownInactiveReps = inactiveReps.filter(rep => rep.role_level === 'MR');

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Team Member
          <span className="text-xs text-gray-500 ml-1">
            ({activeReps.length + inactiveReps.length} available)
          </span>
          {selectedTeam === 'independent' && (
            <span className="text-xs text-blue-600 ml-1">[Independent Only]</span>
          )}
        </label>
        <select
          value={selectedMR}
          onChange={(e) => setSelectedMR(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Representatives</option>

          {knownActiveReps.length > 0 && (
            <optgroup label={`🟢 Active Medical Reps (${knownActiveReps.length})`}>
              {knownActiveReps.map(rep => (
                <option key={rep.name} value={rep.name}>
                  {rep.name}
                </option>
              ))}
            </optgroup>
          )}

          {salesAgents.length > 0 && (
            <optgroup label={`🔶 Sales Agents (${salesAgents.length})`}>
              {salesAgents.map(rep => (
                <option key={rep.name} value={rep.name}>
                  {rep.name} (Sales Agent)
                </option>
              ))}
            </optgroup>
          )}

          {knownInactiveReps.length > 0 && (
            <optgroup label={`🔴 Inactive Medical Reps (${knownInactiveReps.length})`}>
              {knownInactiveReps.map(rep => (
                <option key={rep.name} value={rep.name}>
                  {rep.name} (Inactive)
                </option>
              ))}
            </optgroup>
          )}

          {activeReps.length === 0 && inactiveReps.length === 0 && (
            <option disabled>No representatives found for current filters</option>
          )}
        </select>

        <div className="mt-1 text-xs text-gray-500">
          {selectedRegion !== 'all' && <span className="mr-2">📍 {selectedRegion}</span>}
          {selectedTeam !== 'all' && selectedTeam !== 'independent' && (
            <span className="mr-2">👥 {teams.find(t => standardizeName(t.name) === selectedTeam)?.name}</span>
          )}
          {selectedTeam === 'independent' && <span className="mr-2">🔸 Independent</span>}
          {selectedState !== 'all' && <span className="mr-2">🏛️ {selectedState}</span>}
          {selectedMR !== 'all' && <span className="mr-2">👤 {selectedMR}</span>}
          {salesAgents.length > 0 && selectedMR === 'all' && <span className="mr-2">🔶 {salesAgents.length} Sales Agents</span>}
        </div>
      </div>
    );
};

const Filters = ({
    selectedPeriod,
    handlePeriodChange,
    selectedWeek,
    setSelectedWeek,
    selectedMonth,
    setSelectedMonth,
    selectedQuarter,
    setSelectedQuarter,
    selectedYear,
    setSelectedYear,
    dateRange,
    setDateRange,
    selectedRegion,
    setSelectedRegion,
    regions,
    selectedTeam,
    setSelectedTeam,
    teams,
    medicalReps,
    selectedState,
    setSelectedState,
    states,
    selectedMR,
    setSelectedMR,
    getFilteredMedicalReps,
    fetchDashboardData,
    salesAgents
}) => {
    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Sales Performance Dashboard</h1>
                <p className="text-gray-600 mt-1">
                {selectedPeriod === 'weekly' && `Week: ${selectedWeek}`}
                {selectedPeriod === 'monthly' && `Month: ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
                {selectedPeriod === 'quarterly' && `Quarter: ${selectedQuarter}`}
                {selectedPeriod === 'yearly' && `Year: ${selectedYear}`}
                {selectedPeriod === 'custom' && `${dateRange.start} to ${dateRange.end}`}
                </p>
            </div>
            <div className="flex items-center space-x-3">
                <button
                onClick={fetchDashboardData}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
                </button>
                <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Download className="w-4 h-4 mr-2" />
                Export Report
                </button>
            </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
                    <div className="flex gap-2">
                        <select
                        value={selectedPeriod}
                        onChange={(e) => handlePeriodChange(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                        <option value="custom">Custom Date Range</option>
                        </select>

                        {selectedPeriod === 'weekly' && (
                        <input
                            type="week"
                            value={selectedWeek}
                            onChange={(e) => setSelectedWeek(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        )}

                        {selectedPeriod === 'monthly' && (
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        )}

                        {selectedPeriod === 'quarterly' && (
                        <select
                            value={selectedQuarter}
                            onChange={(e) => setSelectedQuarter(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="2024-Q1">2024 Q1</option>
                            <option value="2024-Q2">2024 Q2</option>
                            <option value="2024-Q3">2024 Q3</option>
                            <option value="2024-Q4">2024 Q4</option>
                            <option value="2023-Q1">2023 Q1</option>
                            <option value="2023-Q2">2023 Q2</option>
                            <option value="2023-Q3">2023 Q3</option>
                            <option value="2023-Q4">2023 Q4</option>
                        </select>
                        )}

                        {selectedPeriod === 'yearly' && (
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="2025">2025</option>
                            <option value="2024">2024</option>
                            <option value="2023">2023</option>
                            <option value="2022">2022</option>
                            <option value="2021">2021</option>
                        </select>
                        )}
                    </div>

                    {selectedPeriod === 'custom' && (
                        <div className="flex items-center gap-2 mt-2">
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        </div>
                    )}
                    </div>

                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
                    <select
                        value={selectedRegion}
                        onChange={(e) => setSelectedRegion(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Regions</option>
                        {regions.map(region => (
                        <option key={region} value={region}>{region}</option>
                        ))}
                    </select>
                    </div>

                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Team (ASM/RSM)</label>
                    <select
                        value={selectedTeam}
                        onChange={(e) => setSelectedTeam(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Teams</option>

                        {teams.map(team => {
                        const mrCount = team.role_level === 'RSM'
                            ? medicalReps.filter(mr =>
                                mr.role_level === 'MR' && (
                                standardizeName(mr.regional_sales_manager_name) === team.name ||
                                (mr.area_sales_manager_name &&
                                medicalReps.some(asm =>
                                    asm.role_level === 'ASM' &&
                                    standardizeName(asm.name) === standardizeName(mr.area_sales_manager_name) &&
                                    standardizeName(asm.regional_sales_manager_name) === team.name
                                ))
                                )
                            ).length
                            : medicalReps.filter(mr =>
                                mr.role_level === 'MR' && standardizeName(mr.area_sales_manager_name) === team.name
                            ).length;

                        return (
                            <option key={team.name} value={team.name}>
                            {team.role_level === 'RSM' ? '🏢' : '👥'} {team.name} ({team.role_level}) - {team.region} [{mrCount} MRs]
                            </option>
                        );
                        })}

                        <option value="independent">
                        🔸 Independent Employees [{medicalReps.filter(rep =>
                            rep.role_level === 'MR' &&
                            !rep.area_sales_manager_name &&
                            !rep.regional_sales_manager_name
                        ).length} MRs]
                        </option>
                    </select>
                    </div>

                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <select
                        value={selectedState}
                        onChange={(e) => setSelectedState(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All States</option>
                        {states.map(state => (
                        <option key={state} value={state}>{state}</option>
                        ))}
                    </select>
                    </div>

                    <EnhancedMedicalRepDropdown
                        selectedMR={selectedMR}
                        setSelectedMR={setSelectedMR}
                        getFilteredMedicalReps={getFilteredMedicalReps}
                        selectedRegion={selectedRegion}
                        selectedTeam={selectedTeam}
                        teams={teams}
                        selectedState={selectedState}
                        salesAgents={salesAgents}
                    />
                </div>
            </div>
        </div>
    )
}

export default Filters;
