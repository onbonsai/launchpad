const Sidebar = () => {
  return (
    <>
      <div className="bg-card rounded-xl p-4">
        <h2 className="text-xl font-semibold mb-6 text-primary">My posts?</h2>
        <div className="space-y-4">
          <div className="cursor-pointer">
            <p className="text-secondary hover:text-primary transition-colors">
              Post Title 1 [disable updates]
            </p>
          </div>
          <div className="cursor-pointer">
            <p className="text-secondary hover:text-primary transition-colors">Post Title 2</p>
          </div>
          <div>
            <p className="text-secondary/60">... or mini publication component?</p>
          </div>
        </div>
      </div>
      <div className="bg-card rounded-xl p-4 mt-10 space-y-4">
        <h2 className="text-xl font-semibold mb-6 text-primary">Bonsai Token</h2>
        <div className="space-y-2">
          <p className="text-sm text-primary hover:text-primary transition-colors">
            Lens Balance
          </p>
          <p className="text-secondary">
            500k $BONSAI
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-primary hover:text-primary transition-colors">
            Staking
          </p>
          <p className="text-secondary">
            0 $BONSAI
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-primary hover:text-primary transition-colors">
            Smart Media Credits (today)
          </p>
          <p className="text-secondary">
            100
          </p>
        </div>
        <div className="flex items-center mt-4 text-xs text-secondary/60">
          <button
            className="ml-auto bg-primary text-white px-4 py-1 rounded-full text-sm"
          >
            Get credits
          </button>
        </div>
      </div>
    </>
  )
};

export default Sidebar;