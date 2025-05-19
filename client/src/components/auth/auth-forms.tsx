import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  remember: z.boolean().optional(),
});

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export function AuthForms() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const { loginMutation, registerMutation } = useAuth();
  
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
      remember: false,
    },
  });
  
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
    },
  });
  
  const onLoginSubmit = (data: LoginFormData) => {
    loginMutation.mutate({
      username: data.username,
      password: data.password,
    });
  };
  
  const onRegisterSubmit = (data: RegisterFormData) => {
    registerMutation.mutate({
      username: data.username,
      password: data.password,
    });
  };

  return (
    <Tabs
      defaultValue="login"
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as 'login' | 'register')}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="login">{t('login')}</TabsTrigger>
        <TabsTrigger value="register">{t('register')}</TabsTrigger>
      </TabsList>
      
      <TabsContent value="login">
        <Form {...loginForm}>
          <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
            <FormField
              control={loginForm.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('username')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('enterUsername')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={loginForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>{t('password')}</FormLabel>
                    <Button variant="link" className="p-0 h-auto text-sm font-normal">
                      {t('forgotPassword')}
                    </Button>
                  </div>
                  <FormControl>
                    <Input type="password" placeholder={t('enterPassword')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={loginForm.control}
              name="remember"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0 rtl:space-x-reverse">
                  <FormControl>
                    <Checkbox 
                      checked={field.value} 
                      onCheckedChange={field.onChange} 
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal cursor-pointer">
                    {t('rememberMe')}
                  </FormLabel>
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {t('login')}
            </Button>
          </form>
        </Form>
        
        <div className="mt-6 text-center">
          <p className="text-muted-foreground">
            {t('dontHaveAccount')}
            <Button 
              variant="link" 
              className="p-0 h-auto font-medium" 
              onClick={() => setActiveTab('register')}
            >
              {t('createAccount')}
            </Button>
          </p>
        </div>
      </TabsContent>
      
      <TabsContent value="register">
        <Form {...registerForm}>
          <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-6">
            <FormField
              control={registerForm.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('username')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('enterUsername')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={registerForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('password')}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={t('enterPassword')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={registerForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('confirmPassword')}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={t('reenterPassword')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {t('register')}
            </Button>
          </form>
        </Form>
        
        <div className="mt-6 text-center">
          <p className="text-muted-foreground">
            {t('alreadyHaveAccount')}
            <Button 
              variant="link" 
              className="p-0 h-auto font-medium" 
              onClick={() => setActiveTab('login')}
            >
              {t('login')}
            </Button>
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
