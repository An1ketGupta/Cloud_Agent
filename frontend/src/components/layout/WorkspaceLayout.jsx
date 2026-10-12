import MobileHeader from './MobileHeader.jsx';
import Sidebar from './Sidebar.jsx';

export default function WorkspaceLayout({
  children,
  user,
  view,
  sidebarOpen,
  onOpenSidebar,
  onCloseSidebar,
  onNewConversation,
  conversations,
  activeId,
  navigate,
  openConversation,
  error,
  onDismissError,
}) {
  return (
    <div className="min-h-screen bg-[#08090a] text-[#f7f8f8] flex flex-col md:flex-row antialiased selection:bg-[#5e6ad2]/30 selection:text-white">
      <MobileHeader onOpenSidebar={onOpenSidebar} />
      {sidebarOpen && (
        <div onClick={onCloseSidebar} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden" />
      )}
      <Sidebar
        user={user}
        view={view}
        sidebarOpen={sidebarOpen}
        onCloseSidebar={onCloseSidebar}
        onNewConversation={onNewConversation}
        conversations={conversations}
        activeId={activeId}
        navigate={navigate}
        openConversation={openConversation}
      />
      <main className="flex-1 min-w-0 min-h-screen flex flex-col relative">
        {error && (
          <div className="sticky top-4 z-30 mx-auto max-w-xl w-[90%] notice notice-error shadow-xl flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={onDismissError} className="text-xs underline ml-3">Dismiss</button>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
