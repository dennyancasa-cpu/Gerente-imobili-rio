const fs = require('fs');
let code = fs.readFileSync('src/components/ContractsView.tsx', 'utf8');

const target = `                   </div>
                </div>
                           </div>
                </div>
            </div>
         </div>
      )}`;

const replacement = `                   </div>
                </div>
            </div>
         </div>
      )}`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/components/ContractsView.tsx', code);
    console.log("Success");
} else {
    console.log("Target not found");
}
