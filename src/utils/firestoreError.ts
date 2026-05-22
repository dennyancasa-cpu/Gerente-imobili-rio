import { auth } from '../firebase';
import { OperationType, FirestoreErrorInfo } from '../types';
import { toast } from 'sonner';

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: (auth.currentUser as any)?.tenantId, // Custom claim if any
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  let userMessage = 'Ocorreu um erro de conexão com o banco de dados. Tente novamente mais tarde.';
  
  if (errInfo.error.includes('Missing or insufficient permissions')) {
    userMessage = 'Erro de permissão: você não tem autorização para realizar esta operação.';
  } else if (errInfo.error.includes('offline') || errInfo.error.includes('network')) {
    userMessage = 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
  }

  toast.error(userMessage);
  
  throw new Error(JSON.stringify(errInfo));
}
