const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The block to replace starts at "// --- Deduplicate Primeiro Aluguel ---"
// and ends at "}, [user, payments, properties, agreements, contracts]);" after checkLatePayments.

const startString = "// --- Deduplicate Primeiro Aluguel ---";
const endString = "}, [user, payments, properties, agreements, contracts]);";

const startIndex = code.indexOf(startString);
const endIndex = code.indexOf(endString, startIndex) + endString.length;

if (startIndex === -1 || endIndex < startIndex) {
    console.error("Could not find block to replace");
    process.exit(1);
}

const replacement = `
  const backgroundTasksRunUser = useRef<string | null>(null);

  // --- Background Data Tasks (Deduplicate, Generate, Clean, Late Checks) ---
  useEffect(() => {
    if (!user || payments.length === 0 || contracts.length === 0 || properties.length === 0) return;
    if (backgroundTasksRunUser.current === user.uid) return;
    
    // Set to true immediately so we don't double trigger
    backgroundTasksRunUser.current = user.uid;

    const runAllBackgroundTasks = async () => {
      try {
        console.log("Starting background tasks...");
        
        // 1. Deduplicate Primeiro Aluguel
        const groupedFirstRent: Record<string, Payment[]> = {};
        for (const p of payments) {
          if (p.type === "rent" && p.description === "Primeiro Aluguel") {
            const key = \`\${p.propertyId}_\${p.tenantId}\`;
            if (!groupedFirstRent[key]) groupedFirstRent[key] = [];
            groupedFirstRent[key].push(p);
          }
        }
        for (const key in groupedFirstRent) {
          if (groupedFirstRent[key].length > 1) {
            const sorted = groupedFirstRent[key].sort((a, b) => {
              if (a.status !== "pending" && b.status === "pending") return -1;
              if (b.status !== "pending" && a.status === "pending") return 1;
              return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
            });
            for (let i = 1; i < sorted.length; i++) {
              if (sorted[i].status === "pending") {
                await deleteDoc(doc(db, "payments", sorted[i].id!)).catch(console.error);
              }
            }
          }
        }

        // 2. Generate Monthly Payments
        const activeContracts = contracts.filter((c) => c.status === "active");
        const today = new Date();
        const nextMonthLimit = addMonths(today, 1);

        for (const contract of activeContracts) {
          if (!contract.startDate || !contract.rentValue) continue;

          let currentPeriod = parseISO(contract.startDate);
          const endPeriod = contract.endDate ? parseISO(contract.endDate) : nextMonthLimit;
          const targetEnd = isBefore(endPeriod, nextMonthLimit) ? endPeriod : nextMonthLimit;

          while (
            currentPeriod.getFullYear() < targetEnd.getFullYear() ||
            (currentPeriod.getFullYear() === targetEnd.getFullYear() &&
              currentPeriod.getMonth() <= targetEnd.getMonth())
          ) {
            const year = currentPeriod.getFullYear();
            const month = currentPeriod.getMonth();

            const paymentExists = payments.some((p) => {
              if (
                p.tenantId !== contract.tenantId ||
                p.propertyId !== contract.propertyId ||
                !(p.type === "rent" ||
                  !p.type ||
                  (p.type !== "deposit" && p.type !== "agreement") ||
                  p.description?.toLowerCase().includes("aluguel"))
              ) return false;

              const checkDateStr = (dateStr?: string) => {
                if (!dateStr) return false;
                const parts = dateStr.split('T')[0].split('-');
                if (parts.length >= 2) {
                  return parseInt(parts[0], 10) === year && (parseInt(parts[1], 10) - 1) === month;
                }
                return false;
              };
              return checkDateStr(p.dueDate) || checkDateStr(p.originalDueDate);
            });

            if (!paymentExists) {
              const paymentDay = contract.paymentDay || 5;
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const actualDay = Math.min(paymentDay, daysInMonth);
              const baseDateStr = \`\${year}-\${String(month + 1).padStart(2, "0")}-\${String(actualDay).padStart(2, "0")}\`;
              const rentAdj = adjustDateToNextBusinessDay(baseDateStr);

              try {
                await addDoc(collection(db, "payments"), cleanObject({
                  propertyId: contract.propertyId,
                  tenantId: contract.tenantId,
                  amount: contract.rentValue,
                  dueDate: rentAdj.adjustedDate,
                  originalDueDate: rentAdj.wasAdjusted ? rentAdj.originalDate : undefined,
                  status: "pending",
                  ownerId: user.uid,
                  type: "rent",
                  description: "Aluguel Mensal",
                  observations: rentAdj.wasAdjusted ? rentAdj.adjustmentReason : "",
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }));
              } catch (err) {
                console.error("Error generating recurring payment:", err);
              }
            }
            currentPeriod = addMonths(currentPeriod, 1);
          }
        }

        // 3. Cleanup Duplicates
        const groupedMonthly: Record<string, Payment[]> = {};
        for (const p of payments) {
          const isRentLike = p.type === "rent" || !p.type || (p.type !== "deposit" && p.type !== "agreement") || p.description?.toLowerCase().includes("aluguel");
          if (isRentLike && p.dueDate) {
            try {
              const parts = p.dueDate.split('T')[0].split('-');
              if (parts.length >= 2) {
                const key = \`\${p.propertyId}_\${p.tenantId}_\${parts[0]}_\${parseInt(parts[1], 10) - 1}\`;
                if (!groupedMonthly[key]) groupedMonthly[key] = [];
                groupedMonthly[key].push(p);
              }
            } catch (e) { }
          }
        }
        for (const key in groupedMonthly) {
          const list = groupedMonthly[key];
          if (list.length > 1) {
            const hasSettled = list.some((p) => p.status === "paid" || p.status === "partial");
            if (hasSettled) {
              const pendings = list.filter((p) => p.status === "pending" || p.status === "late");
              for (const p of pendings) {
                if (p.id) await deleteDoc(doc(db, "payments", p.id)).catch(console.error);
              }
            } else {
              const pendings = list
                .filter((p) => p.status === "pending" || p.status === "late")
                .sort((a, b) => (new Date(a.createdAt || 0).getTime()) - (new Date(b.createdAt || 0).getTime()));
              for (let i = 1; i < pendings.length; i++) {
                if (pendings[i].id) await deleteDoc(doc(db, "payments", pendings[i].id!)).catch(console.error);
              }
            }
          }
        }

        // 4. Check Late Payments
        const todayStr = format(new Date(), "yyyy-MM-dd");
        const todayDate = parseISO(todayStr);
        for (const p of payments) {
          if (p.status === "pending" || p.status === "late") {
            if (p.dueDate < todayStr) {
              const property = properties.find((pr) => pr.id === p.propertyId);
              const agreement = p.type === "agreement" ? agreements.find((a) => a.id === p.agreementId) : null;
              const contract = contracts.find((c) => c.tenantId === p.tenantId && c.propertyId === p.propertyId && c.status === "active");
              const tenant = tenants.find((t) => t.id === p.tenantId);
              const configSource = agreement || contract || tenant || property;

              let interest = 0;
              if (configSource && configSource.chargeLateFees) {
                const daysLate = differenceInDays(todayDate, parseISO(p.dueDate));
                if (daysLate > 0) {
                  interest = (configSource.lateFeePenalty || 0) + (p.amount * ((configSource.lateFeeDaily || 0) / 100) * daysLate);
                }
              }

              const calculatedInterest = Number(interest.toFixed(2));
              if (p.status === "pending" || p.interestAmount !== calculatedInterest) {
                try {
                  await updateDoc(doc(db, "payments", p.id!), {
                    status: "late",
                    interestAmount: calculatedInterest,
                    updatedAt: new Date().toISOString(),
                  });
                } catch (err) {
                  console.error("Error updating late payment:", err);
                }
              }
            }
          }
        }
        
        console.log("Background tasks complete.");
      } catch (err) {
        console.error("Background tasks failed:", err);
      }
    };

    runAllBackgroundTasks();
  }, [
    user, 
    payments.length > 0, 
    contracts.length > 0, 
    properties.length > 0,
    payments,
    contracts,
    properties,
    agreements,
    tenants
  ]);
`;

code = code.substring(0, startIndex) + replacement + code.substring(endIndex);

fs.writeFileSync('src/App.tsx', code, 'utf8');
console.log("Replaced successfully!");
